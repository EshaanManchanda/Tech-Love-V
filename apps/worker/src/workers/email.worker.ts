import { Worker } from "bullmq";
import { connection } from "../redis.js";
import { sendEmail } from "../services/emailService.js";
import { renderTemplate, type EmailTemplateType } from "../emails/templates.js";

interface EmailJobData {
  type: EmailTemplateType;
  to: string;
  data: Record<string, unknown>;
}

export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job) => {
    const { subject, html } = renderTemplate(job.data.type, job.data.data);
    await sendEmail({ to: job.data.to, subject, html });
  },
  { connection },
);

emailWorker.on("failed", (job, err) => {
  console.error(`[email worker] job ${job?.id} (${job?.data.type}) failed:`, err.message);
});
