/**
 * React context for chain selection. Wraps the module-level chain registry
 * so components can:
 *   - render based on current chain
 *   - switch chains with persistence
 *   - block render until the registry is loaded from BE
 *
 * Place <ChainProvider> at the top of the app tree.
 */

"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  hydrateChains,
  listChains,
  getChain,
  getDefaultChainKey,
  getActiveChainKey,
  setActiveChainKey,
  subscribeToChainChanges,
  isChainRegistryReady,
} from "./chains";
import { API_URL } from "./config";

const STORAGE_KEY = "creditgraph:active_chain";

const ChainContext = createContext(null);

export function useChain() {
  const ctx = useContext(ChainContext);
  if (!ctx) {
    throw new Error("useChain() must be used inside <ChainProvider>");
  }
  return ctx;
}

/**
 * Chain-aware wrapper around the whole app.
 *
 * On mount:
 *   1. Fetches /api/chains from BE
 *   2. Hydrates the chain registry
 *   3. Restores last-used chain from localStorage (or default)
 *   4. Subscribes to chain changes so renders stay fresh
 */
export function ChainProvider({ children, fallback }) {
  const [ready, setReady] = useState(isChainRegistryReady());
  const [tick, setTick] = useState(0); // bumped on chain change to force re-render
  const [bootError, setBootError] = useState(null);

  // --- Fetch registry from BE ---
  useEffect(() => {
    if (ready) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/chains`);
        if (!res.ok) throw new Error(`BE returned ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        hydrateChains(data);

        // Restore last-used chain if valid, else default
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        const available = listChains().map((c) => c.key);
        const activeKey = stored && available.includes(stored) ? stored : getDefaultChainKey();
        setActiveChainKey(activeKey);
        setReady(true);
      } catch (e) {
        console.error("Failed to load chain registry:", e);
        if (!cancelled) setBootError(e.message || String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [ready]);

  // --- Subscribe to chain changes to force re-render of consumers ---
  useEffect(() => {
    const unsub = subscribeToChainChanges(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  // --- Switch to a different chain ---
  const switchChain = useCallback((key) => {
    try {
      getChain(key); // throws if unknown
      setActiveChainKey(key);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, key);
      }
    } catch (e) {
      console.error("switchChain failed:", e);
    }
  }, []);

  // --- Loading / error states ---
  if (bootError) {
    return (
      <div style={{
        padding: 40, textAlign: "center", fontFamily: "sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "60vh", color: "#991b1b",
      }}>
        <h2>Can't reach the server</h2>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
          CreditGraph tried to load supported chains from the backend and got:
          <br />
          <code>{bootError}</code>
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px", background: "#f97316", color: "white",
            border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ready) {
    return fallback ?? <ChainBootSpinner />;
  }

  const chains = listChains();
  const activeKey = getActiveChainKey();
  const activeChain = getChain(activeKey);

  const value = {
    activeChain,           // the full chain object
    activeChainKey: activeKey,
    chains,                // list of all available chains
    switchChain,           // (key) => void
    _tick: tick,           // for debugging; forces consumers to re-render
  };

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

function ChainBootSpinner() {
  return (
    <div style={{
      minHeight: "80vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 20, fontFamily: "sans-serif",
    }}>
      <div style={{
        width: 40, height: 40,
        border: "3px solid #e5e7eb",
        borderTopColor: "#f97316",
        borderRadius: "50%",
        animation: "cg-spin 0.8s linear infinite",
      }} />
      <style>{`
        @keyframes cg-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ fontSize: 14, color: "#6b7280" }}>Loading CreditGraph…</div>
    </div>
  );
}