"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Action } from "./actions";
import { TRANSIENT_ACTIONS } from "./actions";
import { reducer } from "./reducer";
import { createInitialState, type MarketplaceState } from "./state";
import { DEMO_ADMIN_ID, DEMO_BUSINESS_ID, DEMO_BUSINESS_OWNER_ID, DEMO_CUSTOMER_ID } from "../data/catalog";
import { DEFAULT_CUSTOMER_LOCATION } from "../data/cities";
import { toDateOnly } from "../time";
import type { AccountType } from "../types";

/**
 * Client-side marketplace runtime.
 *
 * Availability is generated in the browser against the real clock, so the
 * store is deliberately *not* rendered on the server — pages render their
 * static, SEO-relevant shell on the server and stream live availability in
 * once this provider is ready. That also removes a whole class of hydration
 * mismatches around "now".
 *
 * Persistence is an action log rather than a state dump: replaying the log
 * over a freshly generated baseline restores the session, and each action
 * maps one-to-one onto the API call that will replace it.
 */

const LOG_KEY = "now.oplog.v2";
const SESSION_KEY = "now.session.v2";
const LOCATION_KEY = "now.location.v2";
const MAX_LOG = 400;
const TICK_MS = 30_000;

export type SessionRole = "guest" | AccountType;

export interface Session {
  role: SessionRole;
  userId: string | null;
  /** Set when the signed-in user manages a business. */
  businessId: string | null;
}

export interface UserLocation {
  label: string;
  lat: number;
  lng: number;
  source: "default" | "device" | "manual";
}

const GUEST_SESSION: Session = { role: "guest", userId: null, businessId: null };

export const DEMO_SESSIONS: Record<Exclude<SessionRole, "guest">, Session> = {
  customer: { role: "customer", userId: DEMO_CUSTOMER_ID, businessId: null },
  business: { role: "business", userId: DEMO_BUSINESS_OWNER_ID, businessId: DEMO_BUSINESS_ID },
  admin: { role: "admin", userId: DEMO_ADMIN_ID, businessId: null },
};

interface MarketplaceContextValue {
  ready: boolean;
  state: MarketplaceState | null;
  dispatch: (action: Action) => void;
  session: Session;
  signIn: (role: Exclude<SessionRole, "guest">) => void;
  signOut: () => void;
  location: UserLocation;
  setLocation: (next: UserLocation) => void;
  requestDeviceLocation: () => Promise<{ ok: boolean; message?: string }>;
  resetDemo: () => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MarketplaceState | null>(null);
  const dispatchRaw = useCallback((action: Action) => {
    setState((current) => (current ? reducer(current, action) : current));
  }, []);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session>(GUEST_SESSION);
  const [location, setLocationState] = useState<UserLocation>({
    ...DEFAULT_CUSTOMER_LOCATION,
    source: "default",
  });
  const log = useRef<Action[]>([]);
  const booted = useRef(false);

  /* ---- Boot: build baseline, replay persisted actions -------------------- */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const now = new Date();
    const anchor = toDateOnly(now);
    let base = createInitialState(now);

    try {
      const raw = window.localStorage.getItem(LOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { anchor: string; actions: Action[] };
        // The demo regenerates its availability every day; a stale log would
        // reference slots that no longer exist.
        if (parsed.anchor === anchor && Array.isArray(parsed.actions)) {
          log.current = parsed.actions;
          for (const action of parsed.actions) base = reducer(base, action);
        } else {
          window.localStorage.removeItem(LOG_KEY);
        }
      }
    } catch {
      window.localStorage.removeItem(LOG_KEY);
    }

    try {
      const rawSession = window.localStorage.getItem(SESSION_KEY);
      if (rawSession) setSession(JSON.parse(rawSession) as Session);
    } catch {
      /* ignore malformed session */
    }
    try {
      const rawLocation = window.localStorage.getItem(LOCATION_KEY);
      if (rawLocation) setLocationState(JSON.parse(rawLocation) as UserLocation);
    } catch {
      /* ignore malformed location */
    }

    setState(reducer(base, { type: "tick", now: Date.now() }));
    setReady(true);
  }, []);

  /* ---- Clock ------------------------------------------------------------- */
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      dispatchRaw({ type: "tick", now: Date.now() });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [ready]);

  const dispatch = useCallback((action: Action) => {
    dispatchRaw(action);
    if (TRANSIENT_ACTIONS.has(action.type)) return;
    log.current = [...log.current, action].slice(-MAX_LOG);
    try {
      window.localStorage.setItem(
        LOG_KEY,
        JSON.stringify({ anchor: toDateOnly(new Date()), actions: log.current }),
      );
    } catch {
      /* storage full or unavailable — the session still works in memory */
    }
  }, []);

  const signIn = useCallback((role: Exclude<SessionRole, "guest">) => {
    const next = DEMO_SESSIONS[role];
    setSession(next);
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = useCallback(() => {
    setSession(GUEST_SESSION);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocation = useCallback((next: UserLocation) => {
    setLocationState(next);
    try {
      window.localStorage.setItem(LOCATION_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const requestDeviceLocation = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { ok: false, message: "This device can't share its location." };
    }
    return new Promise<{ ok: boolean; message?: string }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            label: "Current location",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            source: "device",
          });
          resolve({ ok: true });
        },
        () => {
          // Denied location never blocks the app — manual search always works.
          resolve({ ok: false, message: "We couldn't get your location. Enter it manually instead." });
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
      );
    });
  }, [setLocation]);

  const resetDemo = useCallback(() => {
    try {
      window.localStorage.removeItem(LOG_KEY);
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(LOCATION_KEY);
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  }, []);

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      ready: ready && state != null,
      state,
      dispatch,
      session,
      signIn,
      signOut,
      location,
      setLocation,
      requestDeviceLocation,
      resetDemo,
    }),
    [ready, state, dispatch, session, signIn, signOut, location, setLocation, requestDeviceLocation, resetDemo],
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used inside <MarketplaceProvider>");
  return ctx;
}

/** Convenience for components that only read. Returns null until ready. */
export function useStore(): MarketplaceState | null {
  return useMarketplace().state;
}

export function useSession(): Session {
  return useMarketplace().session;
}
