"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { txCoordinator } from "@/lib/blockchain";
import { useChainData } from "@/lib/useChainData";
import { usdc, shortAddress, formatCountdown, relativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";

export default function AttestationsTab({ walletAddress, user, tx, refetchUser, setActiveModal, setAmount, setTargetAddress }) {
  const [view, setView] = useState("given"); // "given" | "received"

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>Social attestations</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Vouch for someone with a USDC bond. Their default slashes you. Your
          attester tier multiplies the bond's weight.
        </p>
      </div>

      {/* Vouch action */}
      <button
        className="btn-primary"
        onClick={() => {
          setAmount("");
          setTargetAddress("");
          setActiveModal("vouch");
        }}
        style={{ marginBottom: 24 }}
      >
        + Vouch for someone
      </button>

      {/* Segmented toggle */}
      <div className="att-toggle">
        <button
          className={view === "given" ? "att-toggle-btn active" : "att-toggle-btn"}
          onClick={() => setView("given")}
        >
          Given ({user?.attestations_given?.length || 0})
        </button>
        <button
          className={view === "received" ? "att-toggle-btn active" : "att-toggle-btn"}
          onClick={() => setView("received")}
        >
          Received ({user?.attestations_received?.length || 0})
        </button>
      </div>

      {view === "given" && (
        <GivenList
          attestations={user?.attestations_given || []}
          walletAddress={walletAddress}
          tx={tx}
          refetchUser={refetchUser}
        />
      )}

      {view === "received" && (
        <ReceivedList attestations={user?.attestations_received || []} />
      )}
    </div>
  );
}

function GivenList({ attestations, walletAddress, tx, refetchUser }) {
  if (attestations.length === 0) {
    return (
      <EmptyState
        title="You haven't vouched for anyone yet."
        body="Vouching for a friend boosts their credit limit. Pick someone you trust — their default costs you."
      />
    );
  }

  return (
    <div>
      {attestations.map((a) => (
        <AttestationCard
          key={a.attestation_id}
          attestation={a}
          isOwner
          walletAddress={walletAddress}
          tx={tx}
          refetchUser={refetchUser}
        />
      ))}
    </div>
  );
}

function ReceivedList({ attestations }) {
  if (attestations.length === 0) {
    return (
      <EmptyState
        title="No one has vouched for you yet."
        body="Get someone to stake a USDC bond on you. Their bond directly boosts your credit limit."
      />
    );
  }

  return (
    <div>
      {attestations.map((a) => (
        <AttestationCard key={a.attestation_id} attestation={a} />
      ))}
    </div>
  );
}

function AttestationCard({ attestation, isOwner, walletAddress, tx, refetchUser }) {
  const a = attestation;
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // Decay calculation (matches contract: linear from 100% to 50% over duration)
  const totalDuration = a.expires_at - a.created_at;
  const elapsed = Math.max(0, now - a.created_at);
  let decayPct = 100;
  if (totalDuration > 0) {
    const ratio = Math.min(1, elapsed / totalDuration);
    decayPct = 100 - 50 * ratio; // 100% → 50%
  }

  const isExpired = now >= a.expires_at;
  const revokeRequested = a.revoke_unlock_at > 0;
  const revokeReady = revokeRequested && now >= a.revoke_unlock_at;
  const revokeRemaining = revokeRequested ? a.revoke_unlock_at - now : 0;

  const handleRequestRevoke = async () => {
    await tx.run({
      title: "Request revoke",
      needsApproval: false,
      steps: [
        { stage: "signing", fn: () => Promise.resolve() },
        {
          stage: "confirming",
          fn: async () => await txCoordinator.requestRevoke(a.attestation_id),
        },
        { stage: "indexing", fn: () => new Promise((r) => setTimeout(r, 800)) },
      ],
      successMessage: "Cooldown started. Bond reclaim available after the cooldown.",
      onSuccess: refetchUser,
    }).catch(() => {});
  };

  const handleFinalizeRevoke = async () => {
    await tx.run({
      title: "Reclaim bond",
      needsApproval: false,
      steps: [
        { stage: "signing", fn: () => Promise.resolve() },
        {
          stage: "confirming",
          fn: async () => await txCoordinator.finalizeRevoke(a.attestation_id),
        },
        { stage: "indexing", fn: () => new Promise((r) => setTimeout(r, 800)) },
      ],
      successMessage: `${usdc(a.bond_usdc)} returned to your wallet.`,
      onSuccess: refetchUser,
    }).catch(() => {});
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
            {isOwner ? "Vouching for" : "Vouched by"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>
            {shortAddress(isOwner ? a.subject_address : a.attester_address)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>
            {usdc(a.bond_usdc)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {isExpired ? "Expired" : `Expires ${relativeTime(a.expires_at)}`}
          </div>
        </div>
      </div>

      {/* Decay bar */}
      {a.active && !isExpired && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 4,
          }}>
            <span>Weight remaining</span>
            <span>{decayPct.toFixed(0)}%</span>
          </div>
          <div style={{ background: "#f3f4f6", height: 4, borderRadius: 2 }}>
            <div style={{
              width: `${decayPct}%`,
              height: "100%",
              background: "var(--primary)",
              borderRadius: 2,
              transition: "width 300ms ease",
            }} />
          </div>
        </div>
      )}

      {/* Revoke controls (only for owner) */}
      {isOwner && a.active && (
        <div style={{ marginTop: 12 }}>
          {!revokeRequested ? (
            <button
              onClick={handleRequestRevoke}
              style={{
                background: "none",
                border: "1px solid var(--border-color)",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                color: "var(--text-main)",
              }}
            >
              Request revoke
            </button>
          ) : revokeReady ? (
            <button
              className="btn-primary"
              onClick={handleFinalizeRevoke}
              style={{ padding: "8px 14px", fontSize: 13, width: "auto" }}
            >
              Reclaim {usdc(a.bond_usdc)}
            </button>
          ) : (
            <div style={{
              padding: 8,
              background: "#fef3c7",
              borderRadius: 6,
              fontSize: 12,
              color: "#92400e",
            }}>
              Cooldown: {formatCountdown(revokeRemaining)} until reclaim
            </div>
          )}
        </div>
      )}

      {/* Inactive marker */}
      {!a.active && (
        <div style={{
          marginTop: 8,
          padding: 6,
          background: "#f3f4f6",
          borderRadius: 4,
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
        }}>
          Revoked / slashed
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}