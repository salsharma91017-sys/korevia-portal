const TZ = "Australia/Melbourne";
export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }) : "Not set";
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-AU", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
export const fmtMoney = (cents: number) => (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  in_development: "In development",
  ready_for_review: "Ready for review",
  accepted: "Accepted",
};
export const STATUS_ORDER = ["backlog", "in_development", "ready_for_review", "accepted"] as const;
