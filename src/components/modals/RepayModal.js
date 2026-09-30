"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usdc, bpsToPct } from "@/lib/format";

export default function RepayModal({
  loanId, amount, setAmount, onConfirm, onCancel, isSubmitting,
}) {
  const [loan, setLoan] = useState(null);

  useEffect(() => {
    if (!loanId) return;
    api.getLoan(loanId)
      .then(setLoan)
      .catch(() => setLoan(null));
  }, [loanId]);

  const totalOwed = loan?.outstanding_total_usdc ?? loan?.outstanding_principal_usdc ?? 0;
  const accruedInterest = loan
    ? (loan.outstanding_total_usdc || 0) - (loan.outstanding_principal_usdc || 0)
    : 0;

  return (
    <div className="modal-overlay">
      <div className="card modal-card">
        <h2>Repay loan #{loanId}</h2>

        {loan && (
          <div style={{ background: "#f9fafb", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <Row label="Principal outstanding" value={usdc(loan.outstanding_principal_usdc)} />
            <Row label="Accrued interest" value={usdc(accruedInterest)} />
            <Row label="APR" value={bpsToPct(loan.apr_bps)} />
            <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8 }}>
              <Row label="Total owed (now)" value={usdc(totalOwed)} bold />
            </div>
          </div>
        )}

        <input
          type="number"
          className="input-field"
          placeholder="Amount to repay (USDC)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          onClick={() => setAmount(totalOwed.toFixed(6))}
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
          Pay full balance
        </button>

        <div className="flex-gap">
          <button className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="btn-primary" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Processing…" : "Repay"}
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