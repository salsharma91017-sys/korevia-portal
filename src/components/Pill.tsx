import { STATUS_LABEL } from "@/lib/format";

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function ResultPill({ status }: { status: "pass" | "fail" | null | undefined }) {
  if (!status) return <span className="pill none">Not tested</span>;
  return <span className={`pill ${status}`}>{status === "pass" ? "Pass" : "Fail"}</span>;
}
