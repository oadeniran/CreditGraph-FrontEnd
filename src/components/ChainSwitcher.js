"use client";

import { useState, useRef, useEffect } from "react";
import { useChain } from "@/lib/chainContext";

/**
 * Compact chain picker for the dashboard header.
 * Click → dropdown of available chains → pick one → active chain switches.
 *
 * No MetaMask prompt on switch; NetworkGuard will offer that if/when needed.
 */
export default function ChainSwitcher() {
  const { activeChain, activeChainKey, chains, switchChain } = useChain();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    function esc(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  if (!chains || chains.length === 0) return null;

  const handlePick = (key) => {
    setOpen(false);
    if (key !== activeChainKey) switchChain(key);
  };

  const chainDot = (chain) => (
    <span
      aria-hidden
      style={{
        width: 8, height: 8, borderRadius: "50%",
        background: _chainColor(chain.key),
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px 4px 8px",
          background: "#f0f0f0",
          border: "1px solid transparent",
          borderRadius: 12,
          fontSize: 13, fontWeight: 500,
          cursor: "pointer",
          color: "var(--text-main)",
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {chainDot(activeChain)}
        <span>{_shortName(activeChain.name)}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>▾</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 220,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div style={{
            padding: "8px 12px",
            fontSize: 11,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            borderBottom: "1px solid #f3f4f6",
          }}>
            Switch chain
          </div>
          {chains.map((chain) => {
            const isActive = chain.key === activeChainKey;
            return (
              <button
                key={chain.key}
                role="menuitem"
                onClick={() => handlePick(chain.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%",
                  padding: "10px 12px",
                  background: isActive ? "#fff7ed" : "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text-main)",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {chainDot(chain)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{chain.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Chain ID {chain.id}{chain.isTestnet ? " · Testnet" : ""}
                  </div>
                </div>
                {isActive && (
                  <span style={{ color: "var(--primary)", fontSize: 14 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// A couple of distinct dot colors so chains are visually distinguishable.
// Falls back to orange for unknown chains.
function _chainColor(key) {
  const map = {
    arbitrum_sepolia: "#28A0F0",     // Arbitrum blue
    monad_testnet: "#9b5df0",         // Monad purple
    optimism_sepolia: "#FF0420",
    base_sepolia: "#0052FF",
  };
  return map[key] || "#f97316";
}

// "Arbitrum Sepolia" → "Arbitrum" when it fits better in the header pill.
function _shortName(name) {
  if (!name) return "Chain";
  // Drop trailing " Sepolia" / " Testnet" to keep the pill compact
  return name.replace(/\s+(Sepolia|Testnet|Mainnet)\s*$/, "");
}