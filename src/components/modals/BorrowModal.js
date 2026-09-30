"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usdc, bpsToPct } from "@/lib/format";

export default function BorrowModal({
  user, amount, setAmount, onConfirm, onCancel, isSubmitting,
}) {
  const [aprBps, setAprBps] = useState(null);
  const [poolUtilBps, setPoolUtilBps] = useState(0);
  const [availableLiquidity, setAvailableLiquidity] = useState(null);
  const [loadingRates, setLoadingRates] = useState(true);

  useEffect(() => {
    if (!user?.credit_score?.tier) return;
    let cancelled = false;
    setLoadingRates(true);

    Promise.all([
      api.getPoolStats(),
      api.getAprPreview(user.credit_score.tier, 0), // tier APR at 0% util as baseline
    ])
      .then(([stats, aprAt0]) => {
        if (cancelled) return;
        setPoolUtilBps(stats.utilization_bps || 0);
        setAvailableLiquidity(stats.available_liquidity_usdc || 0);
        // Re-query APR at the actual current utilization
        return api.getAprPreview(user.credit_score.tier, stats.utilization_bps || 0);
      })
      .then((live) => {
        if (cancelled || !live) return;
        setAprBps(live.borrow_apr_bps);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingRates(false);
      });

    return () => { cancelled = true; };
  }, [user?.credit_score?.tier]);

  const amt = parseFloat(amount) || 0;
  const interest30 = aprBps ? (amt * (aprBps / 10000) * 30) / 365 : 0;
  const total30 = amt + interest30;

  const insufficientLiquidity =
    availableLiquidity !== null && amt > 0 && amt > availableLiquidity;
  const overHeadroom = amt > (user?.headroom_usdc || 0);

  return (
    <div className="modal-overlay">
      <div className="card modal-card">
        <h2>Borrow USDC</h2>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-muted)" }}>
          Your headroom: <strong>{usdc(user?.headroom_usdc || 0)}</strong>
          {availableLiquidity !== null && (
            <>
              {" "}· Pool liquidity: <strong>{usdc(availableLiquidity)}</strong>
            </>
          )}
        </p>

        <input
          type="number"
          className="input-field"
          placeholder="Amount (USDC)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div style={{ background: "#f9fafb", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <Row label="Term" value="30 days" />
          <Row label="APR" value={loadingRates ? "…" : bpsToPct(aprBps || 0)} />
          <Row label="Interest (est.)" value={usdc(interest30)} />
          <Row label="Pool utilization" value={`${(poolUtilBps / 100).toFixed(1)}%`} />
          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8 }}>
            <Row label="Total owed at maturity" value={usdc(total30)} bold />
          </div>
        </div>

        {insufficientLiquidity && (
          <div style={{
            background: "#fef3c7", padding: 10, borderRadius: 8, marginBottom: 12,
            fontSize: 13, color: "#92400e",
          }}>
            ⚠ Pool only has {usdc(availableLiquidity)} available. Try a smaller amount or ask
            someone to supply liquidity first.
          </div>
        )}

        {overHeadroom && (
          <div style={{
            background: "#fee2e2", padding: 10, borderRadius: 8, marginBottom: 12,
            fontSize: 13, color: "#991b1b",
          }}>
            Exceeds your credit headroom of {usdc(user?.headroom_usdc || 0)}.
          </div>
        )}

        <div className="flex-gap">
          <button className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={isSubmitting || amt <= 0 || overHeadroom || insufficientLiquidity}
          >
            {isSubmitting ? "Confirming…" : "Borrow"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}