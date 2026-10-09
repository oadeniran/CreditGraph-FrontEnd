import { usdc, bpsToPct, shortAddress, formatCountdown } from "@/lib/format";
import { useEffect, useState } from "react";
import { useChain } from "@/lib/chainContext";

export default function HomeTab({
  user, styles,
  setActiveModal, setAmount, setSelectedLoan, goToHistory,
  handleFaucet, handleFinalizeScore, handleRefreshScore,
  handleCreateIdentityHere,
}) {
  const { activeChain } = useChain();

  // ⚠️ All hooks MUST come before any early return (Rules of Hooks).
  // Pending-score countdown runs even when the no-identity CTA shows;
  // in that case `user.pending_score` is absent and the effect is a no-op.
  const [pendingRemaining, setPendingRemaining] = useState(0);
  useEffect(() => {
    if (!user?.pending_score || user.pending_score.finalized) {
      setPendingRemaining(0);
      return;
    }
    const update = () => {
      const remaining = user.pending_score.finalize_after - Math.floor(Date.now() / 1000);
      setPendingRemaining(Math.max(0, remaining));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [user?.pending_score]);

  // ----------------------------------------------------------------
  // No identity on this chain → full-width onboarding CTA
  // ----------------------------------------------------------------
  if (user && user.has_identity === false) {
    return <NoIdentityOnChain chain={activeChain} onCreate={handleCreateIdentityHere} />;
  }

  // ----------------------------------------------------------------
  // Normal dashboard
  // ----------------------------------------------------------------
  const topLoans = user?.active_loans?.slice(0, 5) || [];
  const topAttestations = user?.attestations_received?.slice(0, 5) || [];
  const score = user?.credit_score?.score;
  const tier = user?.credit_score?.tier;
  const isStale = user?.credit_score?.is_stale;

  const showPendingCard = user?.pending_score && !user.pending_score.finalized;
  const canFinalize = showPendingCard && pendingRemaining === 0;

  return (
    <div>
      {/* Credit card hero */}
      <div className={`card ${styles.creditCard}`}>
        <p className={styles.cardSubtitle}>
          Available credit <span style={{ opacity: 0.6 }}>· {activeChain.name}</span>
        </p>
        <div className={`big-number ${styles.cardValue}`}>
          {usdc(user?.headroom_usdc || 0)}
        </div>

        <div className={`flex-row ${styles.cardDivider}`}>
          <div>
            <p className={styles.smallLabel}>Score {isStale && "(stale)"}</p>
            <div className={styles.boldValue}>{score || "—"}</div>
          </div>
          <div>
            <p className={styles.smallLabel}>Tier</p>
            <div className={styles.tierValue}>{tier || 1}</div>
          </div>
          <div className={styles.alignRight}>
            <p className={styles.smallLabel}>Limit</p>
            <div className={styles.boldValue}>{usdc(user?.available_limit_usdc || 0)}</div>
          </div>
        </div>
      </div>

      {/* Pending score banner */}
      {showPendingCard && (
        <div className="card" style={{ background: "#fff7ed", border: "1px solid #fdba74" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#9a3412" }}>
            Score submission pending: {user.pending_score.score} (Tier {user.pending_score.tier})
          </p>
          <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#9a3412" }}>
            {canFinalize
              ? "Challenge window closed. Ready to finalize."
              : `Finalizes in ${formatCountdown(pendingRemaining)}`}
          </p>
          <button
            className="btn-primary"
            disabled={!canFinalize}
            onClick={handleFinalizeScore}
            style={{ padding: "10px 16px" }}
          >
            {canFinalize ? "Finalize now" : "Waiting…"}
          </button>
        </div>
      )}

      {/* USDC balance + faucet */}
      <div className="card" style={{ background: "#f9fafb" }}>
        <div className="flex-row">
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>USDC balance</p>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{usdc(user?.usdc_balance || 0)}</div>
          </div>
          <button
            onClick={handleFaucet}
            style={{
              background: "none",
              border: "1px dashed var(--primary)",
              color: "var(--primary)",
              padding: "8px 14px",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Get test USDC
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-gap">
        <button
          className="btn-primary"
          onClick={() => { setAmount(""); setActiveModal("borrow"); }}
          disabled={!user?.headroom_usdc || user.headroom_usdc <= 0}
        >
          Borrow
        </button>
        <button
          className="btn-secondary"
          onClick={() => { setAmount(""); setActiveModal("vouch"); }}
        >
          Vouch
        </button>
      </div>

      {/* Active loans */}
      <h2 className={styles.sectionTitle}>Active loans</h2>
      {topLoans.length === 0 ? (
        <p className={styles.smallLabel}>No active loans.</p>
      ) : (
        topLoans.map((loan) => (
          <div key={loan.loan_id} className="card flex-row">
            <div>
              <div className={styles.loanAmount}>
                {usdc(loan.outstanding_total_usdc || loan.outstanding_principal_usdc || 0)}
              </div>
              <div className={loan.state === "Late" ? styles.loanStateLate : styles.loanStateActive}>
                {loan.state} · {bpsToPct(loan.apr_bps)} APR
              </div>
            </div>
            <button
              className={styles.actionButton}
              onClick={() => {
                setSelectedLoan(loan.loan_id);
                setAmount((loan.outstanding_total_usdc || loan.outstanding_principal_usdc).toFixed(2));
                setActiveModal("repay");
              }}
            >
              Repay
            </button>
          </div>
        ))
      )}
      {user?.active_loans?.length > 5 && (
        <button className={styles.viewAllBtn} onClick={() => goToHistory("loans")}>
          View all loans
        </button>
      )}

      {/* Attestations received */}
      <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>
        Vouches backing you
      </h2>
      {topAttestations.length === 0 ? (
        <p className={styles.smallLabel}>No one has vouched for you yet.</p>
      ) : (
        topAttestations.map((att) => (
          <div key={att.attestation_id || att.attester_token_id} className={`card flex-row ${styles.attestCard}`}>
            <span className={styles.attestText}>
              {shortAddress(att.attester_address)}
            </span>
            <span className={styles.attestAmount}>{usdc(att.bond_usdc)}</span>
          </div>
        ))
      )}

      {/* Score refresh */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button
          onClick={handleRefreshScore}
          style={{
            background: "none",
            border: "none",
            color: "var(--primary)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Refresh score now
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Empty-state CTA when the user has no identity on the current chain
// ----------------------------------------------------------------

function NoIdentityOnChain({ chain, onCreate }) {
  const [creating, setCreating] = useState(false);

  const handleClick = async () => {
    setCreating(true);
    try {
      await onCreate?.();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Hero card — same visual language as the main credit card, but inverted */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #0b0b0b 0%, #1a1a1a 100%)",
          color: "white",
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Chain badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 999,
            fontSize: 11,
            color: "#d4d4d8",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#f97316",
            }}
          />
          {chain.name}
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 8px",
            color: "white",
            lineHeight: 1.25,
          }}
        >
          Create your CreditGraph identity on {chain.name}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#9ca3af",
            lineHeight: 1.5,
            margin: "0 0 20px",
          }}
        >
          Your score, loans, and vouches are per-chain. Mint a soulbound
          identity here to borrow, vouch, and build credit on {chain.name}.
        </p>

        <button
          onClick={handleClick}
          disabled={creating}
          className="btn-primary"
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: 15,
            fontWeight: 600,
            opacity: creating ? 0.6 : 1,
            cursor: creating ? "wait" : "pointer",
          }}
        >
          {creating ? "Setting up identity…" : `Create identity on ${chain.name}`}
        </button>
      </div>

      {/* What this means — small explainer */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>
          What happens next
        </h3>
        <ol
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            paddingLeft: 20,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          <li>Mint a non-transferable ERC-5192 identity NFT on {chain.name}.</li>
          <li>Three underwriter agents compute your initial score and sign a quorum.</li>
          <li>You can immediately borrow, supply to the pool, and get vouched for.</li>
        </ol>
      </div>

      {/* Why per-chain — soft explainer so it doesn't feel broken */}
      <div
        style={{
          marginTop: 24,
          padding: 14,
          background: "#f9fafb",
          border: "1px solid #f3f4f6",
          borderRadius: 10,
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--text-main)" }}>Why a separate identity?</strong>{" "}
        Each chain holds its own copy of the protocol — pool, agents, oracle. Your
        identity on one chain can later port its reputation to another via the
        cross-chain attestation bridge.
      </div>
    </div>
  );
}