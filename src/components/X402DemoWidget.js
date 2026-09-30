"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { explorerLink } from "@/lib/chains";
import { usdc, shortAddress, shortHash } from "@/lib/format";
import { toast } from "@/lib/toast";

/**
 * Shows the x402 agent-to-agent payment story:
 *   - Open a channel from Agent 1 (Underwriter) → Agent 2 (Data Collector)
 *   - Step through cumulative voucher settlements
 *   - Each settle is a real on-chain tx
 *
 * Makes the agentic-economy claim concrete for judges.
 */
export default function X402DemoWidget({ chainKey = "arbitrumSepolia" }) {
  const [channel, setChannel] = useState(null);
  const [cumulative, setCumulative] = useState(0); // USDC raw units
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);

  // Pre-load any existing channels on mount
  useEffect(() => {
    api.listChannels()
      .then((data) => {
        const demo = (data.channels || []).find((c) => c.is_demo && c.open);
        if (demo) {
          setChannel({
            channel_id: demo.channel_id,
            payer: demo.payer,
            payee: demo.payee,
            deposit_usdc: demo.deposit_usdc,
          });
          setCumulative(Math.floor((demo.claimed_usdc || 0) * 1e6));
        }
      })
      .catch(() => {});
  }, []);

  const handleOpen = async () => {
    setBusy(true);
    try {
      const ch = await api.demoOpenChannel();
      setChannel(ch);
      setCumulative(0);
      setHistory([{ kind: "open", tx: ch.open_tx, amount: ch.deposit_usdc, time: Date.now() }]);
      toast.success("Channel opened", `Agent 1 deposited $1 for Agent 2 to draw from.`);
    } catch (e) {
      toast.error("Couldn't open channel", e.message);
    }
    setBusy(false);
  };

  const handleSettle = async () => {
    if (!channel) return;
    setBusy(true);
    try {
      // Increment by $0.10 each time
      const next = cumulative + 100_000;
      const result = await api.demoSettleChannel(channel.channel_id, next);
      setCumulative(next);
      setHistory((h) => [
        { kind: "settle", tx: result.settle_tx, amount: 0.1, cumulative: next / 1e6, time: Date.now() },
        ...h,
      ]);
      toast.success("Payment settled", `Agent 2 claimed $0.10. Cumulative: ${usdc(next / 1e6)}`);
    } catch (e) {
      toast.error("Settle failed", e.message);
    }
    setBusy(false);
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>x402 agent payments</h2>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Agent-to-agent micropayments on Arbitrum. Cumulative vouchers, one on-chain
        settlement claims everything.
      </p>

      {!channel ? (
        <button
          className="btn-primary"
          onClick={handleOpen}
          disabled={busy}
          style={{ padding: "10px 16px" }}
        >
          {busy ? "Opening channel…" : "Open demo channel"}
        </button>
      ) : (
        <>
          <div style={{
            background: "#f9fafb",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Payer (Underwriter)</div>
                <div style={{ fontSize: 12, fontFamily: "monospace" }}>
                  {shortAddress(channel.payer)}
                </div>
              </div>
              <div style={{ color: "var(--primary)", fontSize: 18 }}>→</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Payee (Data Collector)</div>
                <div style={{ fontSize: 12, fontFamily: "monospace" }}>
                  {shortAddress(channel.payee)}
                </div>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              paddingTop: 8,
              borderTop: "1px solid #e5e7eb",
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Deposit</div>
                <div style={{ fontWeight: 600 }}>{usdc(channel.deposit_usdc)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Claimed</div>
                <div style={{ fontWeight: 600, color: "var(--primary)" }}>
                  {usdc(cumulative / 1e6)}
                </div>
              </div>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleSettle}
            disabled={busy || cumulative >= channel.deposit_usdc * 1e6}
            style={{ padding: "10px 16px" }}
          >
            {busy ? "Settling…" :
              cumulative >= channel.deposit_usdc * 1e6 ? "Channel depleted" :
              "Agent 2 claims $0.10"}
          </button>

          {history.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                Recent activity
              </div>
              {history.slice(0, 4).map((h, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: 12,
                  borderTop: i > 0 ? "1px solid #f3f4f6" : "none",
                }}>
                  <span>
                    {h.kind === "open" ? "Channel opened" : `Claim ${usdc(h.amount)}`}
                  </span>
                  <a
                    href={explorerLink(chainKey, "tx", h.tx)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--primary)", textDecoration: "none" }}
                  >
                    {shortHash(h.tx)} ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}