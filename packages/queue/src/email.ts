import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "@ticket-app/env/server";

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
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
