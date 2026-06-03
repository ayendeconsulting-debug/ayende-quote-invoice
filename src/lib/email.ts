import "server-only";
import { Resend } from "resend";
import { shareUrl } from "@/lib/share";

export interface SendResult {
  ok: boolean;
  error?: string;
}

const DEFAULT_FROM = "Ayende Consulting Inc. <quotes@ayendecx.com>";

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
    const { error } = await resend.emails.send({ from, to: params.to, subject, html });
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
