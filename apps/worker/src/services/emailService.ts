export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

async function sendViaResend(msg: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.EMAIL_FROM ?? "Certificate Generator <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
}

function sendViaConsole(msg: EmailMessage): void {
  console.log(`[email:console] to=${msg.to} subject="${msg.subject}"\n${msg.html}\n`);
}

/**
 * No RESEND_API_KEY configured → logs instead of sending (dev-safe default).
 * Swap for another provider by adding a branch here — the queue/worker side
 * doesn't need to change.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(msg);
  } else {
    sendViaConsole(msg);
  }
}
