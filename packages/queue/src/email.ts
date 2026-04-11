import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "@ticket-app/env/server";

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST || "", // e.g., "smtp.ticket.cloud.habib.cloud"
      port: env.SMTP_PORT || 587, // default to 587 if SMTP_PORT is not set
      secure: env.SMTP_SECURE || false, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER || env.SMTP_FROM || "", // fallback to SMTP_FROM if SMTP_USER is not set
        pass: env.SMTP_PASS || "", // fallback to empty string if SMTP_PASS is not set
      },
    });
  }
  return transporter;
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transport = getTransporter();
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function verifyConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch {
    return false;
  }
}

export async function closeTransporter(): Promise<void> {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}
