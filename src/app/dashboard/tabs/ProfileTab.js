"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { explorerLink } from "@/lib/chains";
import { usdc, shortAddress, shortHash } from "@/lib/format";

export default function ProfileTab({
  user, styles, setActiveModal, disconnectWallet,
}) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonPayload, setReasonPayload] = useState(null);
  const [reasonLoading, setReasonLoading] = useState(false);

  const loadReason = async () => {
    if (!user?.credit_score?.reason_hash) return;
    setReasonOpen(true);
    setReasonLoading(true);
    try {
      const r = await api.getScoreReason(user.credit_score.reason_hash);
      setReasonPayload(r);
    } catch (e) {
      setReasonPayload({ error: e.message });
    } finally {
      setReasonLoading(false);
    }
  };

  const grad = user?.graduation;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.avatar}>
        {(user?.token_id || "?").toString().slice(-2)}
      </div>
      <div className={styles.profileAddress}>
        {shortAddress(user?.wallet_address, 8, 6)}
      </div>

      <div className="card" style={{ width: "100%", textAlign: "left", marginBottom: 16 }}>
        <Row label="Identity NFT" value={`#${user?.token_id || "—"}`} />
        <Row label="Current tier" value={`Tier ${user?.credit_score?.tier || 1}`} accent />
        <Row label="Score" value={user?.credit_score?.score || "—"} />
        <Row label="Total limit" value={usdc(user?.available_limit_usdc || 0)} />
        <Row label="Attestation weight" value={usdc(user?.attestation_weight_usdc || 0)} />
      </div>

      {/* Graduation progress */}
      {grad && (
        <div className="card" style={{ width: "100%", textAlign: "left", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Graduation</h3>
          <Row label="On-time streak" value={grad.streak} />
          <Row label="Lifetime on-time" value={grad.lifetime_on_time} />
          <Row label="Lifetime defaults" value={grad.lifetime_defaults} />
          {grad.to_next_tier > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: "#f0fdf4", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                <strong>{grad.to_next_tier}</strong> more on-time repayments → Tier {(user?.credit_score?.tier || 1) + 1}
              </p>
            </div>
          )}
        </div>
      )}

      {user?.credit_score?.reason_hash && (
        <button
          onClick={loadReason}
          style={{
            background: "none",
            border: "1px solid var(--border-color)",
            padding: "10px 16px",
            borderRadius: 10,
            cursor: "pointer",
            marginBottom: 12,
            color: "var(--text-main)",
            fontWeight: 600,
            width: "100%",
          }}
        >
          Why this score? →
        </button>
      )}

      <button
        className="btn-primary"
        onClick={() => setActiveModal("increase_score")}
        style={{ marginBottom: 12 }}
      >
        Increase credit score
      </button>
      <button className="btn-secondary" onClick={disconnectWallet}>
        Disconnect wallet
      </button>

      {/* Score reason modal */}
      {reasonOpen && (
        <div className="modal-overlay" onClick={() => setReasonOpen(false)}>
          <div
            className="card modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: "left" }}
          >
            <h2>Score breakdown</h2>
            {reasonLoading && <p>Loading…</p>}
            {reasonPayload?.error && <p style={{ color: "red" }}>{reasonPayload.error}</p>}
            {reasonPayload && !reasonPayload.error && (
              <>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                  {reasonPayload.explainer}
                </p>
                {Object.entries(reasonPayload.components || {}).map(([key, c]) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{key.replace(/_/g, " ")}</span>
                      <span>
                        {(c.value * 100).toFixed(0)}% · weight {(c.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ background: "#f3f4f6", height: 6, borderRadius: 3, marginTop: 4 }}>
                      <div
                        style={{
                          width: `${c.value * 100}%`,
                          background: "var(--primary)",
                          height: "100%",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                      {c.note}
                    </p>
                  </div>
                ))}
              </>
            )}
            <button
              className="btn-primary"
              onClick={() => setReasonOpen(false)}
              style={{ marginTop: 16 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: accent ? "var(--primary)" : "var(--text-main)" }}>
        {value}
      </span>
    </div>
  );
}