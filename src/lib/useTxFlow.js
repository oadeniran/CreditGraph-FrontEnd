"use client";

import { useState, useCallback } from "react";
import { toast } from "./toast";

/**
 * Wraps a tx-coordinator call in a state machine and exposes:
 *   - state: current modal state
 *   - run(steps, title): execute a series of stages
 *   - reset(): clear state
 *
 * `steps` is an array of { stage, fn } where fn is async and returns either
 * void or { txHash } to update the modal as the work progresses.
 */
export function useTxFlow() {
  const [state, setState] = useState({ stage: "idle" });

  const reset = useCallback(() => setState({ stage: "idle" }), []);

  const run = useCallback(async ({ title, needsApproval, steps, onSuccess, successMessage }) => {
    setState({ stage: steps[0].stage, title, needsApproval });
    try {
      let lastResult = null;
      for (const step of steps) {
        setState((s) => ({ ...s, stage: step.stage, title, needsApproval }));
        lastResult = await step.fn();
        if (lastResult && lastResult.txHash) {
          setState((s) => ({ ...s, txHash: lastResult.txHash }));
        }
      }
      setState((s) => ({ ...s, stage: "done" }));
      if (successMessage) {
        toast.success(title || "Success", successMessage);
      }
      if (onSuccess) onSuccess(lastResult);
      return lastResult;
    } catch (err) {
      const errMsg = parseErr(err);
      setState((s) => ({
        ...s,
        stage: "error",
        errorStage: s.stage,
        error: errMsg,
      }));
      toast.error(title || "Transaction failed", errMsg);
      throw err;
    }
  }, []);

  return { state, run, reset };
}

function parseErr(err) {
  if (!err) return "Unknown error";
  // MetaMask user rejection
  if (err.code === 4001 || err.code === "ACTION_REJECTED") {
    return "You rejected the transaction.";
  }
  // Known custom error selectors → friendly messages
  const data = err.data?.data || err.data || "";
  if (typeof data === "string" && data.startsWith("0x")) {
    const friendly = CUSTOM_ERROR_MESSAGES[data.slice(0, 10)];
    if (friendly) return friendly;
  }
  // Contract revert with reason
  if (err.reason) return err.reason;
  if (err.shortMessage) return err.shortMessage;
  if (err.info?.error?.message) return err.info.error.message;
  if (err.data?.message) return err.data.message;
  if (err.message) {
    const m = err.message.match(/reverted: (.+?)(?:\(|$)/);
    if (m) return m[1].trim();
    if (err.message.length < 200) return err.message;
    return err.message.slice(0, 200) + "...";
  }
  return String(err);
}

// Selectors of custom errors we care about. To compute these:
//   bytes4(keccak256("InsufficientLiquidity(uint256,uint256)"))
const CUSTOM_ERROR_MESSAGES = {
  "0xa17e11d5": "The lending pool doesn't have enough liquidity for this borrow.",
  // Add more as we hit them — easy to extend.
};