import { usdc, bpsToPct, shortAddress, formatCountdown } from "@/lib/format";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function HomeTab({
  user, styles,
  setActiveModal, setAmount, setSelectedLoan, goToHistory,
  handleFaucet, handleFinalizeScore, handleRefreshScore,
}) {
  const topLoans = user?.active_loans?.slice(0, 5) || [];
  const topAttestations = user?.attestations_received?.slice(0, 5) || [];
  const score = user?.credit_score?.score;
  const tier = user?.credit_score?.tier;
  const isStale = user?.credit_score?.is_stale;

  // Pending score countdown
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

  const showPendingCard = user?.pending_score && !user.pending_score.finalized;
  const canFinalize = showPendingCard && pendingRemaining === 0;

  return (
    <div>
      {/* Credit card hero */}
      <div className={`card ${styles.creditCard}`}>
        <p className={styles.cardSubtitle}>Available credit</p>
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