"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { txCoordinator } from "@/lib/blockchain";
import { useChainData } from "@/lib/useChainData";
import { usdc, bpsToPct } from "@/lib/format";
import { toast } from "@/lib/toast";

export default function PoolTab({ walletAddress, tx, refetchUser, user }) {
  const [mode, setMode] = useState(null); // "supply" | "withdraw" | null
  const [amount, setAmount] = useState("");

  const { data: stats, refetch: refetchStats } = useChainData(
    () => api.getPoolStats(),
    [],
    { pollMs: 10_000 }
  );

  const { data: balance, refetch: refetchBalance } = useChainData(
    () => api.getPoolBalance(walletAddress),
    [walletAddress],
    { enabled: Boolean(walletAddress), pollMs: 10_000 }
  );

  const utilPct = (stats?.utilization_bps || 0) / 100;
  const supplyApr = stats?.supply_apr_bps || 0;
  const sharePrice =
    balance?.shares > 0 ? balance.assets_usdc / (balance.shares / 1e6) : 1;

  const handleSupply = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Invalid amount", "Enter a USDC amount above 0.");
      return;
    }
    if (amt > (user?.usdc_balance || 0)) {
      toast.error("Not enough USDC", `You have ${usdc(user?.usdc_balance || 0)}. Use the faucet?`);
      return;
    }
    setMode(null);
    setAmount("");

    await tx.run({
      title: `Supply $${amt}`,
      needsApproval: true,
      steps: [
        { stage: "approving", fn: () => Promise.resolve() }, // handled inside supply()
        {
          stage: "confirming",
          fn: async () => await txCoordinator.supply(walletAddress, amt),
        },
        { stage: "indexing", fn: () => new Promise((r) => setTimeout(r, 800)) },
      ],
      successMessage: `Supplied $${amt} to the pool. You now earn yield.`,
      onSuccess: () => {
        refetchStats();
        refetchBalance();
        refetchUser();
      },
    }).catch(() => {});
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Invalid amount", "Enter a USDC amount above 0.");
      return;
    }
    if (amt > (balance?.assets_usdc || 0)) {
      toast.error("Exceeds your position", `You have ${usdc(balance?.assets_usdc || 0)}.`);
      return;
    }
    if (amt > (stats?.available_liquidity_usdc || 0)) {
      toast.error(
        "Insufficient pool liquidity",
        "Funds are currently lent out. Try again later or withdraw less."
      );
      return;
    }
    setMode(null);
    setAmount("");

    await tx.run({
      title: `Withdraw $${amt}`,
      needsApproval: false,
      steps: [
        { stage: "signing", fn: () => Promise.resolve() },
        {
          stage: "confirming",
          fn: async () => await txCoordinator.withdraw(walletAddress, amt),
        },
        { stage: "indexing", fn: () => new Promise((r) => setTimeout(r, 800)) },
      ],
      successMessage: `Withdrew $${amt} from the pool.`,
      onSuccess: () => {
        refetchStats();
        refetchBalance();
        refetchUser();
      },
    }).catch(() => {});
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>Earn yield</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Supply USDC, earn interest from borrowers. Withdraw anytime if liquidity allows.
        </p>
      </div>

      {/* Your position */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
          color: "white",
          padding: 20,
        }}
      >
        <p style={{ color: "#aaa", margin: 0, fontSize: 12 }}>Your supplied position</p>
        <div style={{ fontSize: 32, fontWeight: 800, color: "white", margin: "6px 0" }}>
          {usdc(balance?.assets_usdc || 0)}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #333",
          }}
        >
          <div>
            <p style={{ color: "#aaa", fontSize: 11, margin: 0 }}>cgUSDC shares</p>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {((balance?.shares || 0) / 1e6).toFixed(4)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#aaa", fontSize: 11, margin: 0 }}>Share price</p>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {sharePrice.toFixed(6)}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-gap">
        <button
          className="btn-primary"
          onClick={() => {
            setAmount("");
            setMode("supply");
          }}
        >
          Supply
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            setAmount("");
            setMode("withdraw");
          }}
          disabled={!balance?.shares || balance.shares === 0}
        >
          Withdraw
        </button>
      </div>

      {/* Pool stats */}
      <h2 style={{ fontSize: 16, marginTop: 24, marginBottom: 12 }}>Pool overview</h2>
      <div className="card">
        <StatRow label="Total supplied" value={usdc(stats?.total_assets_usdc || 0)} />
        <StatRow label="Total borrowed" value={usdc(stats?.total_borrowed_usdc || 0)} />
        <StatRow
          label="Available liquidity"
          value={usdc(stats?.available_liquidity_usdc || 0)}
        />
        <StatRow label="Utilization" value={`${utilPct.toFixed(1)}%`} />
        <StatRow
          label="Supply APY (est.)"
          value={bpsToPct(supplyApr)}
          accent
        />
        <StatRow
          label="Cumulative interest paid"
          value={usdc(stats?.cumulative_interest_usdc || 0)}
        />
        {stats?.cumulative_losses_usdc > 0 && (
          <StatRow
            label="Cumulative losses"
            value={usdc(stats.cumulative_losses_usdc)}
          />
        )}
      </div>

      {/* Utilization gauge */}
      <UtilizationGauge utilizationPct={utilPct} />

      {/* Supply / Withdraw modal */}
      {mode && (
        <div className="modal-overlay" onClick={() => setMode(null)}>
          <div
            className="card modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{mode === "supply" ? "Supply USDC" : "Withdraw USDC"}</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              {mode === "supply"
                ? `Your USDC balance: ${usdc(user?.usdc_balance || 0)}`
                : `Your position: ${usdc(balance?.assets_usdc || 0)}`}
            </p>

            <input
              type="number"
              className="input-field"
              placeholder="Amount (USDC)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />

            <button
              onClick={() => {
                const max =
                  mode === "supply"
                    ? user?.usdc_balance || 0
                    : balance?.assets_usdc || 0;
                setAmount(max.toFixed(6));
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 12,
                padding: 0,
              }}
            >
              Max
            </button>

            {mode === "supply" && (
              <div
                style={{
                  background: "#f0fdf4",
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#166534",
                }}
              >
                You'll earn approximately {bpsToPct(supplyApr)} APY based on current
                utilization. Yield is paid in cgUSDC share appreciation.
              </div>
            )}

            <div className="flex-gap">
              <button
                className="btn-secondary"
                onClick={() => setMode(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={mode === "supply" ? handleSupply : handleWithdraw}
              >
                {mode === "supply" ? "Supply" : "Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, accent }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        fontSize: 14,
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: accent ? "var(--primary)" : "var(--text-main)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function UtilizationGauge({ utilizationPct }) {
  const kinkPct = 80; // matches InterestRateModel default kink
  const pct = Math.min(100, utilizationPct);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)" }}>
        Pool utilization
      </p>
      <div
        style={{
          position: "relative",
          height: 12,
          background: "#f3f4f6",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background:
              pct > kinkPct
                ? "linear-gradient(90deg, var(--primary) 0%, #dc2626 100%)"
                : "var(--primary)",
            transition: "width 300ms ease",
          }}
        />
        {/* Kink marker */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${kinkPct}%`,
            width: 2,
            height: "100%",
            background: "#000",
            opacity: 0.4,
          }}
          title={`Kink at ${kinkPct}%`}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        <span>0%</span>
        <span style={{ position: "relative", left: "30%" }}>kink {kinkPct}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}