"use client";

import { explorerLink } from "@/lib/chains";
import { shortHash } from "@/lib/format";

/**
 * Renders a 4-step modal: Approve → Sign → Confirm → Index → Done.
 * Driven by a `state` object the parent updates as the tx progresses.
 *
 * state shape:
 *   { stage: "idle"|"approving"|"signing"|"confirming"|"indexing"|"done"|"error",
 *     txHash?: string,
 *     error?: string,
 *     title?: string,
 *     needsApproval?: boolean }
 */

const STAGE_ORDER = ["approving", "signing", "confirming", "indexing", "done"];
const STAGE_LABELS = {
  approving: "Approve USDC",
  signing: "Sign transaction",
  confirming: "Confirming on-chain",
  indexing: "Indexing event",
  done: "Done",
};

function stageStatus(currentStage, stepStage) {
  if (currentStage === "error") return "idle";
  const ci = STAGE_ORDER.indexOf(currentStage);
  const si = STAGE_ORDER.indexOf(stepStage);
  if (ci === -1) return "idle";
  if (ci > si) return "done";
  if (ci === si) return "active";
  return "idle";
}

export default function TxModal({ state, chainKey, onClose }) {
  if (!state || state.stage === "idle") return null;

  const steps = state.needsApproval
    ? STAGE_ORDER
    : STAGE_ORDER.filter((s) => s !== "approving");

  const isTerminal = state.stage === "done" || state.stage === "error";

  return (
    <div className="modal-overlay">
      <div className="card tx-modal-card">
        <h2>{state.title || "Transaction"}</h2>

        {steps.map((stage) => {
          const status = state.stage === "error" && stage === state.errorStage
            ? "error"
            : stageStatus(state.stage, stage);
          return (
            <div key={stage} className={`tx-step ${status}`}>
              <span className="tx-step-icon">
                {status === "done" ? "✓" : status === "error" ? "!" : STAGE_ORDER.indexOf(stage) + 1}
              </span>
              <span>{STAGE_LABELS[stage]}</span>
            </div>
          );
        })}

        {state.txHash && (
          <a
            href={explorerLink(chainKey, "tx", state.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-hash-link"
          >
            View on Arbiscan: {shortHash(state.txHash)}
          </a>
        )}

        {state.stage === "error" && state.error && (
          <div className="tx-error-detail">{state.error}</div>
        )}

        {isTerminal && (
          <button
            className="btn-primary"
            onClick={onClose}
            style={{ marginTop: 16 }}
          >
            {state.stage === "done" ? "Done" : "Close"}
          </button>
        )}
      </div>
    </div>
  );
}