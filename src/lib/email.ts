import "server-only";
import { Resend } from "resend";
import { shareUrl } from "@/lib/share";

export interface SendResult {
  ok: boolean;
  error?: string;
}

const DEFAULT_FROM = "Ayende Consulting Inc. <quotes@ayendecx.com>";

/**
 * Where client replies should land. The `from` addresses are on the no-reply
 * sending subdomain (mail.ayendecx.com), so without this replies bounce. Defaults
 * to the monitored admin inbox; override with REPLY_TO_EMAIL if it ever moves.
 */
function replyToAddress(): string {
  return process.env.REPLY_TO_EMAIL || "admin@ayendecx.com";
}

/**
 * Send a quote share link to a client. Defensive: if RESEND_API_KEY is unset
 * (e.g. before the user has wired Resend), this returns { ok:false, error }
 * instead of throwing, so the app keeps working and the UI can fall back to a
 * copyable link.
 */
export async function sendQuoteShareEmail(params: {
  to: string;
  quoteNumber: string;
  token: string;
  businessName: string;
  clientName: string;
  title?: string | null;
  message?: string | null;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: "Email isn't configured yet (RESEND_API_KEY is not set). The share link still works — copy it and send manually." };
  }
  if (!params.to) return { ok: false, error: "This client has no email address on file." };

  const from = process.env.QUOTE_FROM_EMAIL || DEFAULT_FROM;
  const url = shareUrl(params.token);
  const subject = `Quote ${params.quoteNumber} from ${params.businessName}`;

  const safeMsg = (params.message || "").trim();
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0d1b2a;max-width:560px;margin:0 auto;">
    <h2 style="color:#0d1b2a;margin:0 0 4px;">${escapeHtml(params.businessName)}</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Quote ${escapeHtml(params.quoteNumber)}</p>
    <p>Hi ${escapeHtml(params.clientName)},</p>
    <p>${safeMsg ? escapeHtml(safeMsg).replace(/\n/g, "<br>") : `Please review your quote${params.title ? ` for <strong>${escapeHtml(params.title)}</strong>` : ""}. You can view it, download a PDF, and accept or decline online using the secure link below.`}</p>
    <p style="margin:28px 0;">
      <a href="${url}" style="background:#e07b39;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block;">View &amp; respond to your quote</a>
    </p>
    <p style="color:#6b7280;font-size:13px;">Or paste this link into your browser:<br><a href="${url}" style="color:#c4641f;">${url}</a></p>
    <hr style="border:none;border-top:1px solid #e4e0d8;margin:24px 0;">
    <p style="color:#7e8c9a;font-size:12px;">${escapeHtml(params.businessName)}</p>
  </div>`;

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from, replyTo: replyToAddress(), to: params.to, subject, html });
    if (error) return { ok: false, error: error.message || "Resend rejected the request." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email." };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

const INVOICE_FROM = "Ayende Consulting Inc. <invoices@ayendecx.com>";

/**
 * Email an invoice to a client with the rendered PDF attached. Defensive like
 * sendQuoteShareEmail: returns { ok:false, error } instead of throwing when
 * RESEND_API_KEY is unset, so the UI can fall back to downloading the PDF.
 */
export async function sendInvoiceEmail(params: {
  to: string;
  invoiceNumber: string;
  businessName: string;
  clientName: string;
  title?: string | null;
  message?: string | null;
  pdf: Buffer;
  dueDate?: string | null;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: "Email isn't configured yet (RESEND_API_KEY is not set). You can still download the PDF and send it manually." };
  }
  if (!params.to) return { ok: false, error: "This client has no email address on file." };

  const from = process.env.INVOICE_FROM_EMAIL || process.env.QUOTE_FROM_EMAIL || INVOICE_FROM;
  const subject = `Invoice ${params.invoiceNumber} from ${params.businessName}`;
  const safeMsg = (params.message || "").trim();
  const due = params.dueDate ? `<p style="color:#6b7280;margin:0 0 16px;">Due ${escapeHtml(params.dueDate)}</p>` : "";

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0d1b2a;max-width:560px;margin:0 auto;">
    <h2 style="color:#0d1b2a;margin:0 0 4px;">${escapeHtml(params.businessName)}</h2>
    <p style="color:#6b7280;margin:0 0 4px;">Invoice ${escapeHtml(params.invoiceNumber)}</p>
    ${due}
    <p>Hi ${escapeHtml(params.clientName)},</p>
    <p>${safeMsg ? escapeHtml(safeMsg).replace(/\n/g, "<br>") : `Please find attached invoice <strong>${escapeHtml(params.invoiceNumber)}</strong>${params.title ? ` for ${escapeHtml(params.title)}` : ""}. Payment details are included in the document.`}</p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">The invoice is attached as a PDF.</p>
    <hr style="border:none;border-top:1px solid #e4e0d8;margin:24px 0;">
    <p style="color:#7e8c9a;font-size:12px;">${escapeHtml(params.businessName)}</p>
  </div>`;

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      replyTo: replyToAddress(),
      to: params.to,
      subject,
      html,
      attachments: [{ filename: `${params.invoiceNumber}.pdf`, content: params.pdf }],
    });
    if (error) return { ok: false, error: error.message || "Resend rejected the request." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email." };
  }
}

/**
 * Email a payment receipt to a client with the rendered receipt PDF attached.
 * Defensive: returns { ok:false, error } instead of throwing when unconfigured.
 */
export async function sendPaymentReceiptEmail(params: {
  to: string;
  invoiceNumber: string;
  businessName: string;
  clientName: string;
  amountText: string;
  paidInFull: boolean;
  balanceText: string | null;
  pdf: Buffer;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: "Email isn't configured yet (RESEND_API_KEY is not set). You can still download the receipt and send it manually." };
  }
  if (!params.to) return { ok: false, error: "This client has no email address on file." };

  const from = process.env.INVOICE_FROM_EMAIL || process.env.QUOTE_FROM_EMAIL || INVOICE_FROM;
  const subject = `Payment receipt — ${params.invoiceNumber} (${params.businessName})`;
  const statusLine = params.paidInFull
    ? `<p style="color:#0f6e56;margin:0 0 16px;"><strong>Paid in full.</strong> Thank you!</p>`
    : `<p style="color:#6b7280;margin:0 0 16px;">Balance remaining: <strong>${escapeHtml(params.balanceText ?? "")}</strong></p>`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0d1b2a;max-width:560px;margin:0 auto;">
    <h2 style="color:#0d1b2a;margin:0 0 4px;">${escapeHtml(params.businessName)}</h2>
    <p style="color:#6b7280;margin:0 0 12px;">Payment receipt for ${escapeHtml(params.invoiceNumber)}</p>
    <p>Hi ${escapeHtml(params.clientName)},</p>
    <p>We&rsquo;ve received your payment of <strong>${escapeHtml(params.amountText)}</strong> toward ${escapeHtml(params.invoiceNumber)}.</p>
    ${statusLine}
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">A detailed receipt is attached as a PDF.</p>
    <hr style="border:none;border-top:1px solid #e4e0d8;margin:24px 0;">
    <p style="color:#7e8c9a;font-size:12px;">${escapeHtml(params.businessName)}</p>
  </div>`;

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      replyTo: replyToAddress(),
      to: params.to,
      subject,
      html,
      attachments: [{ filename: `receipt-${params.invoiceNumber}.pdf`, content: params.pdf }],
    });
    if (error) return { ok: false, error: error.message || "Resend rejected the request." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send receipt." };
  }
}

/**
 * Email a payment reminder to a client, with the invoice PDF attached. Wording
 * differs for an upcoming due date vs. an overdue balance. Defensive like the
 * other senders: returns { ok:false, error } instead of throwing when unconfigured.
 */
export async function sendInvoiceReminderEmail(params: {
  to: string;
  invoiceNumber: string;
  businessName: string;
  clientName: string;
  title?: string | null;
  kind: "DUE_SOON" | "OVERDUE";
  dueDate?: string | null;
  balanceText: string;
  pdf: Buffer;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, error: "Email isn't configured yet (RESEND_API_KEY is not set). You can still download the PDF and send it manually." };
  }
  if (!params.to) return { ok: false, error: "This client has no email address on file." };

  const from = process.env.INVOICE_FROM_EMAIL || process.env.QUOTE_FROM_EMAIL || INVOICE_FROM;
  const overdue = params.kind === "OVERDUE";
  const n = escapeHtml(params.invoiceNumber);
  const forTitle = params.title ? ` for ${escapeHtml(params.title)}` : "";

  const subject = overdue
    ? `Overdue: Invoice ${params.invoiceNumber} from ${params.businessName}`
    : `Reminder: Invoice ${params.invoiceNumber}${params.dueDate ? ` due ${params.dueDate}` : ""}`;

  const lead = overdue
    ? `Our records show invoice <strong>${n}</strong>${forTitle} is past due${params.dueDate ? ` (it was due ${escapeHtml(params.dueDate)})` : ""}. If your payment is already on its way, please disregard this note — otherwise we'd appreciate settling it at your earliest convenience.`
    : `This is a friendly reminder that invoice <strong>${n}</strong>${forTitle} is due${params.dueDate ? ` on ${escapeHtml(params.dueDate)}` : " soon"}.`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0d1b2a;max-width:560px;margin:0 auto;">
    <h2 style="color:#0d1b2a;margin:0 0 4px;">${escapeHtml(params.businessName)}</h2>
    <p style="color:#6b7280;margin:0 0 16px;">Invoice ${n}</p>
    <p>Hi ${escapeHtml(params.clientName)},</p>
    <p>${lead}</p>
    <p style="margin:16px 0;">Amount due: <strong>${escapeHtml(params.balanceText)}</strong></p>
    <p style="color:#6b7280;font-size:13px;margin-top:20px;">The invoice and payment details are attached as a PDF.</p>
    <hr style="border:none;border-top:1px solid #e4e0d8;margin:24px 0;">
    <p style="color:#7e8c9a;font-size:12px;">${escapeHtml(params.businessName)}</p>
  </div>`;

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      replyTo: replyToAddress(),
      to: params.to,
      subject,
      html,
      attachments: [{ filename: `${params.invoiceNumber}.pdf`, content: params.pdf }],
    });
    if (error) return { ok: false, error: error.message || "Resend rejected the request." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send reminder." };
  }
}
