"""Alerts: console, plus Discord / Telegram / generic webhooks.

Notification failures are logged and swallowed. A dead webhook must never take
down a running trading loop or, worse, prevent a stop-loss from being managed.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from abc import ABC, abstractmethod

from .models import Side, Signal, Trade

log = logging.getLogger(__name__)


class Notifier(ABC):
    @abstractmethod
    def send(self, text: str, *, level: str = "info") -> None:
        ...

    # -- shaped messages ----------------------------------------------------- #

    def signal_alert(self, symbol: str, signal: Signal, price: float, extra: str = "") -> None:
        arrow = {Side.LONG: "▲ LONG", Side.SHORT: "▼ SHORT", Side.FLAT: "■ FLAT"}[signal.side]
        msg = (
            f"{arrow} {symbol} @ {price:,.6g}\n"
            f"conviction {signal.strength:.0%} — {signal.reason}"
        )
        if extra:
            msg += f"\n{extra}"
        self.send(msg)

    def trade_alert(self, trade: Trade) -> None:
        result = "WIN" if trade.is_win else "LOSS"
        r_txt = f" ({trade.r_multiple:+.2f}R)" if trade.r_multiple is not None else ""
        self.send(
            f"{result} {trade.symbol} {trade.side.value} closed: "
            f"{trade.pnl:+,.2f}{r_txt} — {trade.reason}",
            level="info" if trade.is_win else "warn",
        )

    def error(self, text: str) -> None:
        self.send(text, level="error")


class ConsoleNotifier(Notifier):
    def send(self, text: str, *, level: str = "info") -> None:
        prefix = {"info": "[·]", "warn": "[!]", "error": "[X]"}.get(level, "[·]")
        for line in text.splitlines():
            print(f"{prefix} {line}", flush=True)


class WebhookNotifier(Notifier):
    """POSTs JSON. `style` shapes the payload for Discord or Telegram."""

    def __init__(self, url: str, style: str = "discord", timeout: int = 10) -> None:
        self.url = url
        self.style = style
        self.timeout = timeout

    def _payload(self, text: str) -> dict:
        if self.style == "discord":
            return {"content": text[:1900]}
        if self.style == "slack":
            return {"text": text[:3000]}
        return {"text": text}

    def send(self, text: str, *, level: str = "info") -> None:
        try:
            data = json.dumps(self._payload(text)).encode("utf-8")
            req = urllib.request.Request(
                self.url, data=data, headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req, timeout=self.timeout).close()
        except (urllib.error.URLError, OSError, ValueError) as exc:
            log.error("webhook notify failed: %s", exc)


class TelegramNotifier(Notifier):
    def __init__(self, token: str, chat_id: str, timeout: int = 10) -> None:
        self.url = f"https://api.telegram.org/bot{token}/sendMessage"
        self.chat_id = chat_id
        self.timeout = timeout

    def send(self, text: str, *, level: str = "info") -> None:
        try:
            data = json.dumps(
                {"chat_id": self.chat_id, "text": text[:4000]}
            ).encode("utf-8")
            req = urllib.request.Request(
                self.url, data=data, headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req, timeout=self.timeout).close()
        except (urllib.error.URLError, OSError, ValueError) as exc:
            log.error("telegram notify failed: %s", exc)


class MultiNotifier(Notifier):
    def __init__(self, *notifiers: Notifier) -> None:
        self.notifiers = [n for n in notifiers if n is not None]

    def send(self, text: str, *, level: str = "info") -> None:
        for n in self.notifiers:
            try:
                n.send(text, level=level)
            except Exception as exc:  # noqa: BLE001 - never let alerts kill the loop
                log.error("notifier %s failed: %s", type(n).__name__, exc)


def build_notifier(config: dict | None = None) -> Notifier:
    """Assemble notifiers from config plus these environment variables:

        TM_DISCORD_WEBHOOK, TM_SLACK_WEBHOOK,
        TM_TELEGRAM_TOKEN + TM_TELEGRAM_CHAT_ID
    """
    config = config or {}
    parts: list[Notifier] = []
    if config.get("console", True):
        parts.append(ConsoleNotifier())

    discord = config.get("discord_webhook") or os.environ.get("TM_DISCORD_WEBHOOK")
    if discord:
        parts.append(WebhookNotifier(discord, "discord"))

    slack = config.get("slack_webhook") or os.environ.get("TM_SLACK_WEBHOOK")
    if slack:
        parts.append(WebhookNotifier(slack, "slack"))

    token = config.get("telegram_token") or os.environ.get("TM_TELEGRAM_TOKEN")
    chat = config.get("telegram_chat_id") or os.environ.get("TM_TELEGRAM_CHAT_ID")
    if token and chat:
        parts.append(TelegramNotifier(token, chat))

    return MultiNotifier(*parts)
