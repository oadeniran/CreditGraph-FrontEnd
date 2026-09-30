/**
 * Display formatting helpers. All UI components use these instead of raw numbers
 * so the look is consistent and locale-aware.
 */

const USDC = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const PERCENT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** Format a number as USDC. usdc(123.456) -> "$123.46" */
export function usdc(value) {
  if (value === null || value === undefined || isNaN(value)) return "$0.00";
  return USDC.format(Number(value));
}

/** Compact USDC for large numbers. usdcCompact(12345) -> "$12.3K" */
export function usdcCompact(value) {
  if (value === null || value === undefined || isNaN(value)) return "$0";
  if (Math.abs(value) < 10_000) return usdc(value);
  return "$" + COMPACT.format(Number(value));
}

/** Convert basis points to a percent string. bpsToPct(1500) -> "15.0%" */
export function bpsToPct(bps) {
  if (bps === null || bps === undefined) return "0.0%";
  return PERCENT.format(Number(bps) / 10000);
}

/** Plain percent from a 0..1 ratio */
export function ratioToPct(ratio) {
  if (ratio === null || ratio === undefined) return "0.0%";
  return PERCENT.format(Number(ratio));
}

/** Shorten an address: 0xabc...def */
export function shortAddress(address, head = 6, tail = 4) {
  if (!address || typeof address !== "string") return "—";
  if (address.length <= head + tail) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** Shorten a tx hash similarly */
export const shortHash = (h) => shortAddress(h, 10, 6);

/** Unix timestamp -> "in 3d", "5h ago" */
export function relativeTime(unixSeconds) {
  if (!unixSeconds) return "";
  const now = Date.now() / 1000;
  const diff = Number(unixSeconds) - now;
  const abs = Math.abs(diff);
  const fmt = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  if (abs < 60) return fmt.format(Math.round(diff), "second");
  if (abs < 3600) return fmt.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return fmt.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return fmt.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return fmt.format(Math.round(diff / (86400 * 30)), "month");
  return fmt.format(Math.round(diff / (86400 * 365)), "year");
}

/** Unix timestamp -> "Jun 14, 2026" */
export function formatDate(unixSeconds) {
  if (!unixSeconds) return "—";
  const d = new Date(Number(unixSeconds) * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Seconds -> "23h 45m" countdown */
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s === 0) return "ready";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/** Score tier label */
export function tierLabel(tier) {
  return `Tier ${tier || 1}`;
}

/** USDC float -> 6-decimal raw bigint for tx args */
export function usdcToRaw(amount) {
  // Avoid float drift: multiply via string
  const [whole, frac = ""] = String(amount).split(".");
  const padded = (frac + "000000").slice(0, 6);
  return BigInt(whole + padded);
}