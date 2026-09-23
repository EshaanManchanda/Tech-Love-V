export type EmailTemplateType = "welcome" | "invite" | "account-created" | "password-reset" | "license-created" | "license-expiring" | "support-reply";

export function renderTemplate(type: EmailTemplateType, data: Record<string, unknown>): { subject: string; html: string } {
  switch (type) {
    case "welcome":
      return {
        subject: "Welcome to Certificate Generator",
        html: `<p>Hi ${data.name},</p><p>Your account is ready. Download the plugin from your dashboard whenever you're ready to install it — the Free plan works with no license key.</p>`,
      };

    case "invite":
      return {
        subject: "You've been issued a Certificate Generator license",
        html: `<p>Hi ${data.name},</p><p>An admin created an account for you with a <strong>${data.plan}</strong> license:</p><p><code>${data.licenseKey}</code></p><p>Set your password to finish setting up your account:</p><p><a href="${data.setPasswordUrl}">${data.setPasswordUrl}</a></p><p>This link expires in 7 days.</p>`,
      };

    case "account-created":
      return {
        subject: "Your account is ready",
        html: `<p>Hi ${data.name},</p><p>An admin created an account for you. Set your password to log in:</p><p><a href="${data.setPasswordUrl}">${data.setPasswordUrl}</a></p><p>This link expires in 7 days.</p>`,
      };

    case "password-reset":
      return {
        subject: "Reset your password",
        html: `<p>Hi ${data.name},</p><p>Someone requested a password reset for your account. Click below to choose a new password:</p><p><a href="${data.resetUrl}">${data.resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
      };

    case "license-created":
      return {
        subject: "Your Certificate Generator license is ready",
        html: `<p>Hi ${data.name},</p><p>Your <strong>${data.plan}</strong> license is ready:</p><p><code>${data.licenseKey}</code></p><p>It's valid until ${data.expiresAt}. Paste it into the plugin's Settings → License tab to activate.</p>`,
      };

    case "license-expiring":
      return {
        subject: `Your Certificate Generator license expires in ${data.daysUntil} day${data.daysUntil === 1 ? "" : "s"}`,
        html: `<p>Hi ${data.name},</p><p>Your <strong>${data.plan}</strong> license expires on ${data.expiresAt}. Renew from your dashboard to keep premium features active.</p>`,
      };

    case "support-reply":
      return {
        subject: `Re: ${data.subject}`,
        html: `<p>Hi ${data.name},</p><p>Support replied to your ticket "${data.subject}":</p><blockquote>${data.body}</blockquote><p>Reply from your dashboard.</p>`,
      };
  }
}
