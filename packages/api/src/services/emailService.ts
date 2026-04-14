import { env } from "@ticket-app/env/server";
import nodemailer from "nodemailer";

export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.APP_URL || "http://localhost:3000"}/portal/reset-password?token=${resetToken}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 480px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #4F46E5; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Support Portal</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">Password Reset Request</h2>
      <p style="margin: 0 0 24px; color: #6b7280; line-height: 1.5;">You requested a password reset for your account. Click the button below to reset your password:</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
      </div>
      <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">This link will expire in 1 hour.</p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">If you didn't request this password reset, please ignore this email. Your account security is protected.</p>
    </div>
    <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
      &copy; ${new Date().getFullYear()} Support Portal. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  const text = `Password Reset Request

You requested a password reset for your account.
Copy and paste this link to reset your password:
${resetUrl}

This link will expire in 1 hour.
If you didn't request this, please ignore this email.`;

  await sendEmail({
    to: email,
    subject: "Password Reset Request",
    html,
    text,
  });
}

export async function sendInviteEmail(
  email: string,
  inviteToken: string,
  organizationName: string,
): Promise<void> {
  const inviteUrl = `${env.APP_URL || "http://localhost:3000"}/portal/register?token=${inviteToken}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to ${organizationName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 480px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #4F46E5; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Support Portal</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">You've been invited to ${organizationName}</h2>
      <p style="margin: 0 0 24px; color: #6b7280; line-height: 1.5;">You've been invited to join ${organizationName} on our support platform. Click the button below to accept the invitation:</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept Invitation</a>
      </div>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">This link will expire in 7 days.</p>
    </div>
    <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
      &copy; ${new Date().getFullYear()} Support Portal. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  const text = `You've been invited to ${organizationName}

You've been invited to join ${organizationName} on our support platform.
Copy and paste this link to accept the invitation:
${inviteUrl}

This link will expire in 7 days.`;

  await sendEmail({
    to: email,
    subject: `You've been invited to ${organizationName}`,
    html,
    text,
  });
}
