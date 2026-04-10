import { env } from "@ticket-app/env/server";

export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  // TODO: Implement actual email sending via SMTP or email service
  console.log("Sending email:", {
    to: params.to,
    subject: params.subject,
  });

  // For now, just log the email
  // In production, this would use a service like SendGrid, AWS SES, etc.
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.APP_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;

  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset for your account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  const text = `
    Password Reset Request
    
    You requested a password reset for your account.
    Copy and paste this link to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    If you didn't request this, please ignore this email.
  `;

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
  const inviteUrl = `${env.APP_URL || "http://localhost:3000"}/auth/invite?token=${inviteToken}`;

  const html = `
    <h1>You've been invited to ${organizationName}</h1>
    <p>You've been invited to join ${organizationName} on our platform.</p>
    <p>Click the link below to accept the invitation:</p>
    <a href="${inviteUrl}">Accept Invitation</a>
    <p>This link will expire in 7 days.</p>
  `;

  const text = `
    You've been invited to ${organizationName}
    
    You've been invited to join ${organizationName} on our platform.
    Copy and paste this link to accept the invitation:
    ${inviteUrl}
    
    This link will expire in 7 days.
  `;

  await sendEmail({
    to: email,
    subject: `You've been invited to ${organizationName}`,
    html,
    text,
  });
}
