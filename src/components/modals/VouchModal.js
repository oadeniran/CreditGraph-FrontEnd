"use client";

import { usdc } from "@/lib/format";

export default function VouchModal({
  amount, setAmount, targetAddress, setTargetAddress,
  onConfirm, onCancel, isSubmitting,
}) {
  const amt = parseFloat(amount) || 0;

  return (
    <div className="modal-overlay">
      <div className="card modal-card">
        <h2>Vouch for a friend</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          Your stake boosts their credit limit. If they default, your bond gets slashed.
        </p>

        <input
          type="text"
          className="input-field"
          placeholder="Friend's wallet (0x…)"
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
        />
        <input
          type="number"
          className="input-field"
          placeholder="Bond (USDC)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div style={{ background: "#fff7ed", padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, color: "#9a3412" }}>
          Your tier multiplier means a {usdc(amt)} bond can boost their limit by up to {usdc(amt * 2)}.
          Bond locked for 90 days with 3-day cooldown to revoke.
        </div>

        <div className="flex-gap">
          <button className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={isSubmitting || amt <= 0 || !targetAddress}
          >
            {isSubmitting ? "Vouching…" : "Stake bond"}
          </button>
        </div>
      </div>
    </div>
  );
}