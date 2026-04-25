interface ResendApiResponse {
  id?: string;
  message?: string;
}

interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}

export interface NotifyContentLeadInput {
  submissionTitle: string;
  submissionExcerpt: string;
  submitterName: string;
  submitterEmail: string;
  prUrl: string | null;
  dashboardUrl: string;
}

export function getEmailConfig(): {
  apiKey: string;
  fromAddress: string;
  contentLeadEmail: string;
} | null {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  const contentLeadEmail = process.env.CONTENT_LEAD_EMAIL;
  if (!apiKey || !fromAddress || !contentLeadEmail) return null;
  return { apiKey, fromAddress, contentLeadEmail };
}

async function sendEmail(apiKey: string, input: SendEmailInput): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body: ResendApiResponse = await res.json().catch(() => ({}));
    throw new Error(
      `Resend send failed: ${res.status} ${body.message ?? res.statusText}`,
    );
  }
}

export async function notifyContentLead(
  input: NotifyContentLeadInput,
): Promise<{ delivered: boolean; reason?: string }> {
  const cfg = getEmailConfig();
  if (!cfg) return { delivered: false, reason: "email_not_configured" };

  const subject = `הוגש מחקר חדש: ${input.submissionTitle}`;
  const lines = [
    `הוגש מחקר חדש לבדיקה.`,
    ``,
    `כותרת: ${input.submissionTitle}`,
    `תקציר: ${input.submissionExcerpt}`,
    ``,
    `הוגש על ידי: ${input.submitterName} <${input.submitterEmail}>`,
    input.prUrl ? `Pull request: ${input.prUrl}` : `Pull request: לא נוצרה (GitHub לא מוגדר)`,
    `דשבורד: ${input.dashboardUrl}`,
  ];

  await sendEmail(cfg.apiKey, {
    to: cfg.contentLeadEmail,
    from: cfg.fromAddress,
    subject,
    text: lines.join("\n"),
  });

  return { delivered: true };
}
