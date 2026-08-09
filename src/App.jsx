import { useCallback, useEffect, useRef, useState } from "react";
import { refresh, onMarket } from "./engine/market.js";
import { runAlerts, onToast } from "./engine/alerts.js";
import { getToken } from "./engine/tokens.js";
import { maybeSeedPortfolio, getState } from "./engine/store.js";
import { setApiKey } from "./engine/api.js";

import Home from "./screens/Home.jsx";
import Feed from "./screens/Feed.jsx";
import Leaderboard from "./screens/Leaderboard.jsx";
import Wallet from "./screens/Wallet.jsx";
import TokenScreen from "./screens/TokenScreen.jsx";
import Notifications from "./screens/Notifications.jsx";
import Alerts from "./screens/Alerts.jsx";
import Settings from "./screens/Settings.jsx";
import Search from "./screens/Search.jsx";
import TraderProfile from "./screens/TraderProfile.jsx";
import TradeSheet from "./screens/TradeSheet.jsx";
import TransferSheet from "./screens/TransferSheet.jsx";
import Success from "./screens/Success.jsx";

import { Sheet } from "./ui/Common.jsx";
import { TokenAvatar } from "./ui/Avatar.jsx";
import { IcHome, IcFeed, IcTrophy, IcWallet, IcTrend } from "./ui/Icons.jsx";

const TABS = [
  { key: "home", label: "Home", Icon: IcHome },
  { key: "feed", label: "Feed", Icon: IcFeed },
  { key: "leaderboard", label: "Ranks", Icon: IcTrophy },
  { key: "wallet", label: "Wallet", Icon: IcWallet },
];

/** Screens that live on top of a tab rather than replacing the tab bar. */
const STACK_SCREENS = new Set([
  "token",
  "notifications",
  "alerts",
  "settings",
  "search",
  "trader",
]);

const MARKET_TICK_MS = 5000;

export default function App() {
  const [tab, setTab] = useState("home");
  const [stack, setStack] = useState([]);
  const [, setBeat] = useState(0);

  const [trade, setTrade] = useState(null); // { tokenId, side }
  const [transfer, setTransfer] = useState(null); // { mode }
  const [success, setSuccess] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef([]);

  /* Market clock: pull fresh quotes, deal the opening book on first load,
     then evaluate alerts against the new prices. `refresh` rate-limits itself,
     so ticking often is cheap. */
  useEffect(() => {
    // Re-apply a saved CoinGecko key before the first request goes out.
    setApiKey(getState().settings.cgKey);

    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await refresh();
      if (cancelled) return;
      maybeSeedPortfolio();
      runAlerts();
      setBeat((b) => b + 1);
    };
    run();
    const id = setInterval(run, MARKET_TICK_MS);
    // Re-render whenever a chart or logo lands from the network.
    const off = onMarket(() => setBeat((b) => b + 1));
    // Catch up immediately when returning to the tab.
    const onVis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      off();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  /* Alert toasts. */
  useEffect(() => {
    return onToast((n) => {
      setToasts((t) => [...t, n].slice(-3));
      const timer = setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== n.id)),
        5000,
      );
      toastTimers.current.push(timer);
    });
  }, []);

  useEffect(() => () => toastTimers.current.forEach(clearTimeout), []);

  const nav = useCallback((screen, params = {}) => {
    if (screen === "deposit") return setTransfer({ mode: "deposit" });
    if (screen === "withdraw") return setTransfer({ mode: "withdraw" });
    if (TABS.some((t) => t.key === screen)) {
      setStack([]);
      return setTab(screen);
    }
    setStack((s) => [...s, { screen, params }]);
    return undefined;
  }, []);

  const back = useCallback(() => setStack((s) => s.slice(0, -1)), []);

  const openTab = (key) => {
    setStack([]);
    setTab(key);
  };

  const top = stack[stack.length - 1];

  const renderTab = () => {
    switch (tab) {
      case "feed":
        return <Feed nav={nav} />;
      case "leaderboard":
        return <Leaderboard nav={nav} />;
      case "wallet":
        return <Wallet nav={nav} />;
      default:
        return <Home nav={nav} />;
    }
  };

  const renderStack = () => {
    if (!top) return null;
    const { screen, params } = top;
    switch (screen) {
      case "token":
        return (
          <TokenScreen
            tokenId={params.tokenId}
            nav={nav}
            back={back}
            onBuy={(id) => setTrade({ tokenId: id, side: "buy" })}
            onSell={(id) => setTrade({ tokenId: id, side: "sell" })}
          />
        );
      case "notifications":
        return <Notifications nav={nav} back={back} />;
      case "alerts":
        return <Alerts back={back} initialTokenId={params.tokenId} />;
      case "settings":
        return <Settings back={back} nav={nav} />;
      case "search":
        return <Search nav={nav} back={back} />;
      case "trader":
        return <TraderProfile traderId={params.traderId} nav={nav} back={back} />;
      default:
        return null;
    }
  };

  const showTabBar = !success;

  return (
    <div className="shell">
      <div className="phone">
        {success ? (
          <Success result={success} onClose={() => setSuccess(null)} />
        ) : (
          <>
            {top && STACK_SCREENS.has(top.screen) ? renderStack() : renderTab()}

            {/* Alert toasts */}
            {toasts.length > 0 && (
              <div className="toast-wrap">
                {toasts.map((t) => {
                  const token = t.tokenId ? getToken(t.tokenId) : null;
                  return (
                    <button
                      key={t.id}
                      className="toast"
                      onClick={() => {
                        setToasts((x) => x.filter((y) => y.id !== t.id));
                        if (t.tokenId) nav("token", { tokenId: t.tokenId });
                      }}
                    >
                      {token ? (
                        <TokenAvatar token={token} size={34} showVerified={false} />
                      ) : (
                        <span className={t.tone === "down" ? "down" : "up"}>
                          <IcTrend size={20} />
                        </span>
                      )}
                      <div className="grow col" style={{ gap: 2, textAlign: "left", minWidth: 0 }}>
                        <span className="small truncate" style={{ fontWeight: 700 }}>
                          {t.title}
                        </span>
                        <span className="tiny muted truncate">{t.body}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Trade sheet */}
            <Sheet
              open={!!trade}
              onClose={() => setTrade(null)}
              label={trade?.side === "sell" ? "Sell" : "Buy"}
            >
              {trade && (
                <TradeSheet
                  tokenId={trade.tokenId}
                  side={trade.side}
                  onClose={() => setTrade(null)}
                  onDone={(res) => {
                    setTrade(null);
                    setSuccess(res);
                  }}
                />
              )}
            </Sheet>

            {/* Deposit / withdraw sheet */}
            <Sheet open={!!transfer} onClose={() => setTransfer(null)} label="Transfer">
              {transfer && (
                <TransferSheet
                  mode={transfer.mode}
                  onClose={() => setTransfer(null)}
                  onDone={(res) => {
                    setTransfer(null);
                    setSuccess(res);
                  }}
                />
              )}
            </Sheet>

            {showTabBar && (
              <nav className="tabbar">
                {TABS.map(({ key, label, Icon }) => {
                  const active = tab === key && !top;
                  return (
                    <button
                      key={key}
                      className={"tabbar-item" + (active ? " active" : "")}
                      onClick={() => openTab(key)}
                    >
                      <Icon size={23} active={active} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
