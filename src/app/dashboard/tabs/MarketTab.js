"use client";

import { useChainData } from "@/lib/useChainData";
import { api } from "@/lib/api";
import { usdc, bpsToPct, shortAddress } from "@/lib/format";
import X402DemoWidget from "@/components/X402DemoWidget";

export default function MarketTab({ chainKey = "arbitrumSepolia" }) {
  const { data: overview, loading } = useChainData(
    () => api.getMarketOverview(),
    [],
    { pollMs: 15_000 }
  );

  const { data: agentsData } = useChainData(
    () => api.getAgents(),
    [],
    { pollMs: 30_000 }
  );

  if (loading || !overview) {
    return (
      <div>
        <h2 style={{ fontSize: 22 }}>Market</h2>
        <div className="skeleton skeleton-line tall" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
      </div>
    );
  }

  const pool = overview.pool || {};
  const insurance = overview.insurance || {};
  const treasury = overview.treasury || {};
  const curves = overview.rate_curves || { curves: [], kink_bps: 8000 };
  const tierLimits = overview.tier_base_limits_usdc || [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>Protocol market</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          On-chain state of the CreditGraph protocol on {chainKey === "arbitrumSepolia" ? "Arbitrum Sepolia" : chainKey}.
        </p>
      </div>

      {/* TVL summary */}
      <div className="card">
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
          Total value locked
        </p>
        <div style={{ fontSize: 32, fontWeight: 800, margin: "4px 0" }}>
          {usdc(pool.total_assets_usdc || 0)}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <Stat label="Borrowed" value={usdc(pool.total_borrowed_usdc || 0)} />
          <Stat label="Available" value={usdc(pool.available_liquidity_usdc || 0)} />
          <Stat label="Utilization" value={`${((pool.utilization_bps || 0) / 100).toFixed(1)}%`} />
        </div>
      </div>

      {/* APR curve visualization */}
      <h2 style={{ fontSize: 16, marginTop: 24, marginBottom: 12 }}>
        Borrow rate curves
      </h2>
      <div className="card" style={{ padding: 20 }}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Lower tiers (riskier borrowers) pay more. Rates spike past the kink to
          incentivize repayment.
        </p>
        <AprCurveChart curves={curves} utilizationBps={pool.utilization_bps || 0} />
      </div>

      {/* Tier limits */}
      <h2 style={{ fontSize: 16, marginTop: 24, marginBottom: 12 }}>
        Tier base limits
      </h2>
      <div className="card">
        {tierLimits.map((limit, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              fontSize: 14,
              borderBottom: i < tierLimits.length - 1 ? "1px solid #f3f4f6" : "none",
            }}
          >
            <span>Tier {i + 1}</span>
            <span style={{ fontWeight: 600 }}>{usdc(limit)}</span>
          </div>
        ))}
      </div>

      {/* Insurance + treasury */}
      <h2 style={{ fontSize: 16, marginTop: 24, marginBottom: 12 }}>
        Protocol reserves
      </h2>
      <div className="card">
        <StatRow label="Insurance fund balance" value={usdc(insurance.balance_usdc || 0)} />
        <StatRow
          label="Total covered (lifetime)"
          value={usdc(insurance.total_covered_usdc || 0)}
        />
        <StatRow
          label="Treasury → insurance share"
          value={`${((treasury.insurance_bps || 0) / 100).toFixed(0)}%`}
        />
        <StatRow
          label="Treasury → ops share"
          value={`${((treasury.operations_bps || 0) / 100).toFixed(0)}%`}
        />
        <StatRow
          label="Treasury → agent rewards"
          value={`${((treasury.agent_rewards_bps || 0) / 100).toFixed(0)}%`}
        />
      </div>

      {/* Agent network */}
      {agentsData?.agents && (
        <>
          <h2 style={{ fontSize: 16, marginTop: 24, marginBottom: 12 }}>
            Underwriter agent network
          </h2>
          <div className="card">
            {agentsData.agents.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom:
                    i < agentsData.agents.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Agent {i + 1}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}
                  >
                    {shortAddress(a.address)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: a.active ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {a.active ? "Active" : "Offline"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {usdc(a.stake_usdc || 0)} staked
                  </div>
                </div>
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                padding: 10,
                background: "#f9fafb",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Every score requires 2-of-3 quorum signatures. Bad submissions get
              slashed from agent stake.
            </div>
          </div>

          {/* x402 demo */}
        <h2 style={{ fontSize: 16, marginTop: 24, marginBottom: 12 }}>
            Agent economy
        </h2>
        <X402DemoWidget chainKey={chainKey} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{label}</p>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
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

/**
 * Kinked APR curve. SVG. X axis = utilization 0..100%, Y axis = APR.
 * Plots all 5 tier curves and a vertical line at the current utilization.
 */
function AprCurveChart({ curves, utilizationBps }) {
  const W = 320;
  const H = 180;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;

  const kinkBps = curves.kink_bps || 8000;
  const tierCurves = curves.curves || [];

  // Find max APR for Y scale
  let maxAprBps = 0;
  tierCurves.forEach((c) => {
    const baseUtil = c.base_bps + c.slope1_bps;
    const fullUtil = baseUtil + c.slope2_bps;
    if (fullUtil > maxAprBps) maxAprBps = fullUtil;
  });
  if (maxAprBps === 0) maxAprBps = 20000;
  // Round up to nearest 5000 bps for clean grid
  maxAprBps = Math.ceil(maxAprBps / 5000) * 5000;

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xForBps = (bps) => PAD_L + (bps / 10000) * innerW;
  const yForApr = (bps) => PAD_T + innerH - (bps / maxAprBps) * innerH;

  // Compute curve path: from 0..kink linearly to base+slope1, then to base+slope1+slope2 at 10000
  const curvePath = (c) => {
    const p0 = `M ${xForBps(0)} ${yForApr(c.base_bps)}`;
    const p1 = `L ${xForBps(kinkBps)} ${yForApr(c.base_bps + c.slope1_bps)}`;
    const p2 = `L ${xForBps(10000)} ${yForApr(c.base_bps + c.slope1_bps + c.slope2_bps)}`;
    return `${p0} ${p1} ${p2}`;
  };

  const colors = ["#dc2626", "#ea580c", "#f59e0b", "#16a34a", "#0ea5e9"];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 400 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={PAD_T + innerH * p}
            y2={PAD_T + innerH * p}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        ))}

        {/* Y axis labels */}
        {[0, 0.5, 1].map((p) => (
          <text
            key={p}
            x={PAD_L - 4}
            y={PAD_T + innerH * (1 - p) + 4}
            fontSize="9"
            textAnchor="end"
            fill="var(--text-muted)"
          >
            {(maxAprBps * p / 100).toFixed(0)}%
          </text>
        ))}

        {/* X axis labels */}
        {[0, 50, 80, 100].map((p) => (
          <text
            key={p}
            x={xForBps(p * 100)}
            y={H - 10}
            fontSize="9"
            textAnchor="middle"
            fill="var(--text-muted)"
          >
            {p}%
          </text>
        ))}

        {/* Kink line */}
        <line
          x1={xForBps(kinkBps)}
          x2={xForBps(kinkBps)}
          y1={PAD_T}
          y2={PAD_T + innerH}
          stroke="#9ca3af"
          strokeWidth="0.5"
          strokeDasharray="3 3"
        />

        {/* Tier curves */}
        {tierCurves.map((c, i) => (
          <path
            key={i}
            d={curvePath(c)}
            fill="none"
            stroke={colors[i] || "#666"}
            strokeWidth="1.5"
          />
        ))}

        {/* Current utilization marker */}
        <line
          x1={xForBps(utilizationBps)}
          x2={xForBps(utilizationBps)}
          y1={PAD_T}
          y2={PAD_T + innerH}
          stroke="var(--primary)"
          strokeWidth="1.5"
        />
        <circle
          cx={xForBps(utilizationBps)}
          cy={PAD_T + 4}
          r="3"
          fill="var(--primary)"
        />
      </svg>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
          fontSize: 11,
        }}
      >
        {tierCurves.map((c, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <div
              style={{
                width: 10,
                height: 2,
                background: colors[i] || "#666",
              }}
            />
            <span style={{ color: "var(--text-muted)" }}>Tier {c.tier}</span>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginLeft: "auto",
          }}
        >
          <div
            style={{
              width: 10,
              height: 2,
              background: "var(--primary)",
            }}
          />
          <span style={{ color: "var(--text-muted)" }}>Current util</span>
        </div>
      </div>
    </div>
  );
}