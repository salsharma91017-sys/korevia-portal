import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COLOURS, EMAIL_LOGO, LINKS, PROMISE, TAGLINE } from "@/lib/brand";

/**
 * Email notifications through Resend (https://resend.com), called over plain HTTPS so there is no extra package.
 *
 * Settings (all optional; with no RESEND_API_KEY the portal works normally and just records "not configured"):
 *   RESEND_API_KEY   server only, secret
 *   EMAIL_FROM       default: KoreVia Client Portal <portal@korevia.solutions>  (the domain must be verified in Resend)
 *   EMAIL_REPLY_TO   default: admin@korevia.solutions
 *
 * Sending never blocks or breaks the action that triggered it: it runs after the response, and every
 * attempt (sent, failed or skipped) is written to the notification_log table.
 */

export type NotifyEvent = "ready_for_review" | "accepted" | "changes_requested";

export type NotifyInput = {
  event: NotifyEvent;
  moduleN: number;
  moduleName: string;
  actor: string; // who did it (display name)
  note?: string | null; // owner's note, sign-off comment, or the change request text
  testLine?: string | null; // e.g. "39 of 39 automatic tests passed"
};

type Recipient = { email: string; name: string };
type Built = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const firstName = (n: string) => (n.trim().split(/\s+/)[0] || "there").replace(/@.*/, "");

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://portal.korevia.solutions").replace(/\/+$/, "");
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// Content -------------------------------------------------------------------------------------------
type Layout = {
  preheader: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[]; // plain text; escaped here
  details: [string, string][]; // label, value
  quote?: { label: string; body: string } | null;
  buttonLabel: string;
  buttonUrl: string;
  closing: string;
};

function render(name: string, l: Layout): { html: string; text: string } {
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${COLOURS.ink};">${esc(t)}</p>`;
  const detailRows = l.details
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:${COLOURS.ink2};white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-size:14px;color:${COLOURS.ink};font-weight:600;">${esc(v)}</td></tr>`,
    )
    .join("");
  const quote = l.quote
    ? `<div style="margin:0 0 18px;padding:12px 14px;border-left:4px solid ${COLOURS.teal};background:#F2F3EF;border-radius:6px;">
         <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${COLOURS.ink2};margin-bottom:4px;">${esc(l.quote.label)}</div>
         <div style="font-size:14px;line-height:1.5;color:${COLOURS.ink};white-space:pre-wrap;">${esc(l.quote.body)}</div>
       </div>`
    : "";
  const html = `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(l.heading)}</title></head>
<body style="margin:0;padding:0;background:${COLOURS.bg};font-family:'Public Sans',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(l.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOURS.bg};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${COLOURS.line};">
    <tr><td style="background:${COLOURS.navy};background-image:linear-gradient(135deg,${COLOURS.navy} 0%,${COLOURS.navy2} 100%);padding:22px 28px;">
      <img src="${EMAIL_LOGO.wordmarkLight}" alt="KoreVia" height="30" style="display:block;height:30px;width:auto;border:0;color:#ffffff;font-size:22px;font-weight:700;">
      <div style="margin-top:10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7ee0d4;">Client portal</div>
    </td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${COLOURS.tealInk};font-weight:700;margin-bottom:6px;">${esc(l.eyebrow)}</div>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:${COLOURS.navy};">${esc(l.heading)}</h1>
      ${p(`Hi ${firstName(name)},`)}
      ${l.paragraphs.map(p).join("")}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">${detailRows}</table>
      ${quote}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;"><tr><td style="background:${COLOURS.blue};border-radius:8px;">
        <a href="${esc(l.buttonUrl)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(l.buttonLabel)}</a>
      </td></tr></table>
      ${p(l.closing)}
    </td></tr>
    <tr><td style="padding:18px 28px 24px;border-top:1px solid ${COLOURS.line};background:#FAFAF8;">
      <div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:${COLOURS.navy};">${esc(PROMISE)}</div>
      <div style="margin-top:6px;font-size:12px;line-height:1.5;color:${COLOURS.ink2};">
        KoreVia Solutions designs, builds and runs AI agents, workflow automation and custom platforms (like this portal).
        <a href="${LINKS.site}" style="color:${COLOURS.blue};">korevia.solutions</a> &middot; <a href="mailto:${LINKS.email}" style="color:${COLOURS.blue};">${LINKS.email}</a>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#737F8B;">You are receiving this because you have a login to the KoreVia client portal. To stop these emails, ask KoreVia to switch them off for you.</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `Hi ${firstName(name)},`,
    "",
    ...l.paragraphs.flatMap((t) => [t, ""]),
    ...l.details.map(([k, v]) => `${k}: ${v}`),
    "",
    ...(l.quote ? [`${l.quote.label}:`, l.quote.body, ""] : []),
    `${l.buttonLabel}: ${l.buttonUrl}`,
    "",
    l.closing,
    "",
    "--",
    `KoreVia Solutions · ${TAGLINE}`,
    `${LINKS.site} · ${LINKS.email}`,
    "You are receiving this because you have a login to the KoreVia client portal.",
  ].join("\n");
  return { html, text };
}

export function buildEmail(input: NotifyInput, recipientName: string): Built {
  const base = siteUrl();
  const mod = `Module ${input.moduleN}: ${input.moduleName}`;
  const note = input.note?.trim() ? input.note.trim().slice(0, 1500) : null;

  if (input.event === "ready_for_review") {
    const r = render(recipientName, {
      preheader: `${mod} is ready for you to review.`,
      eyebrow: "Ready for review",
      heading: `${mod} is ready for your review`,
      paragraphs: [
        "KoreVia has finished this module and put it forward for your review. The test guide, the latest test results and the screenshots are all in the portal.",
        "When you have been through it, you can accept the module or ask for changes.",
      ],
      details: [["Module", mod], ["Status", "Ready for review"], ...(input.testLine ? ([["Automatic tests", input.testLine]] as [string, string][]) : []), ["Sent by", input.actor]],
      quote: note ? { label: "Note from KoreVia", body: note } : null,
      buttonLabel: "Review this module",
      buttonUrl: `${base}/modules/${input.moduleN}?tab=status`,
      closing: "If anything is unclear, just reply to this email.",
    });
    return { subject: `[KoreVia Portal] ${mod} is ready for review`, ...r };
  }

  if (input.event === "accepted") {
    const r = render(recipientName, {
      preheader: `${mod} has been accepted.`,
      eyebrow: "Accepted",
      heading: `${mod} has been accepted`,
      paragraphs: [
        `${input.actor} has signed off this module. The acceptance, with the test results at the time, is kept in the portal as a permanent record.`,
        "Thank you for the review.",
      ],
      details: [["Module", mod], ["Status", "Accepted"], ...(input.testLine ? ([["Automatic tests", input.testLine]] as [string, string][]) : []), ["Accepted by", input.actor]],
      quote: note ? { label: "Comment with the sign-off", body: note } : null,
      buttonLabel: "View the acceptance record",
      buttonUrl: `${base}/modules/${input.moduleN}?tab=evidence`,
      closing: "Any invoicing follows the agreement; KoreVia will be in touch separately about that.",
    });
    return { subject: `[KoreVia Portal] ${mod} accepted`, ...r };
  }

  const r = render(recipientName, {
    preheader: `${input.actor} asked for changes to ${mod}.`,
    eyebrow: "Changes requested",
    heading: `Changes requested on ${mod}`,
    paragraphs: [
      `${input.actor} has asked for changes. The module is back in development, and it will come back for review once the changes are made.`,
    ],
    details: [["Module", mod], ["Status", "In development"], ["Requested by", input.actor]],
    quote: note ? { label: "What needs to change", body: note } : null,
    buttonLabel: "Open the module",
    buttonUrl: `${base}/modules/${input.moduleN}?tab=status`,
    closing: "The request is listed on the module's Status tab until it is resolved.",
  });
  return { subject: `[KoreVia Portal] Changes requested on ${mod}`, ...r };
}

// Sending -------------------------------------------------------------------------------------------
type SendResult = { ok: boolean; detail: string };

async function sendOne(to: string, mail: Built): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, detail: "Not sent: RESEND_API_KEY is not set in Vercel." };
  const from = process.env.EMAIL_FROM || "KoreVia Client Portal <portal@korevia.solutions>";
  const replyTo = process.env.EMAIL_REPLY_TO || LINKS.email;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(15000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, detail: `Resend said ${res.status}: ${body.message ?? body.name ?? "no detail"}`.slice(0, 300) };
    return { ok: true, detail: body.id ?? "sent" };
  } catch (e) {
    return { ok: false, detail: `Could not reach Resend: ${e instanceof Error ? e.message : "unknown error"}`.slice(0, 300) };
  }
}

async function log(event: string, moduleN: number | null, to: string, subject: string, r: SendResult) {
  try {
    await createAdminClient().from("notification_log").insert({ event, module_n: moduleN, to_email: to, subject, ok: r.ok, detail: r.detail });
  } catch {
    /* logging must never break anything */
  }
}

async function recipientsFor(event: NotifyEvent): Promise<Recipient[]> {
  const roles = event === "ready_for_review" ? ["client"] : ["owner", "client"];
  const { data } = await createAdminClient().from("profiles").select("email, full_name").in("role", roles).eq("notify_email", true);
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const p of (data ?? []) as { email: string; full_name: string | null }[]) {
    const e = p.email.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push({ email: p.email.trim(), name: p.full_name || p.email });
  }
  return out;
}

/** Fire and forget. Safe to call from any server action; never throws. */
export function notifyModuleEvent(input: NotifyInput) {
  const work = async () => {
    try {
      const people = await recipientsFor(input.event);
      for (const person of people) {
        const mail = buildEmail(input, person.name);
        const r = await sendOne(person.email, mail);
        await log(input.event, input.moduleN, person.email, mail.subject, r);
      }
    } catch {
      /* never break the action that asked for the email */
    }
  };
  try {
    after(work);
  } catch {
    void work(); // outside a request (tests, scripts)
  }
}

/** Owner's "send me a test email" button: awaited so the owner sees the real result. */
export async function sendTestEmail(toEmail: string, toName: string): Promise<SendResult> {
  const mail = buildEmail(
    { event: "ready_for_review", moduleN: 1, moduleName: "Test email", actor: "KoreVia", note: "This is only a test. Nothing has changed in the portal.", testLine: "39 of 39 passed" },
    toName,
  );
  mail.subject = "[KoreVia Portal] Test email";
  const r = await sendOne(toEmail, mail);
  await log("test", null, toEmail, mail.subject, r);
  return r;
}
