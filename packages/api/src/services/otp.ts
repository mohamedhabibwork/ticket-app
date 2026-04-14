import { getRedis } from "@ticket-app/db/lib/sessions";
import { env } from "@ticket-app/env/server";
import nodemailer from "nodemailer";
import crypto from "crypto";

const OTP_TTL_SECONDS = 300;
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 3;

export type OtpType = "login" | "password_reset" | "email_verification" | "2fa_email";
export type OtpMethod = "email" | "whatsapp";

interface OtpData {
  code: string;
  email?: string;
  phone?: string;
  method: OtpMethod;
  type: OtpType;
  attempts: number;
  createdAt: string;
}

function generateCode(): string {
  return crypto.randomInt(0, 999999).toString().padStart(OTP_LENGTH, "0");
}

function getRedisClient() {
  return getRedis();
}

export async function createOtp(
  email?: string,
  phone?: string,
  type: OtpType = "login",
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateCode();
  const redis = getRedisClient();
  const key = `otp:${type}:${email || phone}`;

  const rateLimitKey = `otp_rate:${type}:${email || phone}`;
  const rateLimitData = await redis.get(rateLimitKey);
  if (rateLimitData) {
    const rateLimit = JSON.parse(rateLimitData) as { count: number; firstSentAt: string };
    const minutesSinceFirst = (Date.now() - new Date(rateLimit.firstSentAt).getTime()) / 1000 / 60;
    if (rateLimit.count >= 5 && minutesSinceFirst < 10) {
      throw new Error("Too many OTP requests. Please wait 10 minutes before trying again.");
    }
    if (minutesSinceFirst >= 10) {
      await redis.del(rateLimitKey);
    }
  }

  const data: OtpData = {
    code,
    email,
    phone,
    method: email ? "email" : "whatsapp",
    type,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };

  await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify(data));

  await redis.setex(
    rateLimitKey,
    600,
    JSON.stringify({
      count: rateLimitData ? (JSON.parse(rateLimitData) as { count: number }).count + 1 : 1,
      firstSentAt: rateLimitData
        ? (JSON.parse(rateLimitData) as { firstSentAt: string }).firstSentAt
        : new Date().toISOString(),
    }),
  );

  return {
    code,
    expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
  };
}

export async function verifyOtp(
  email: string | undefined,
  phone: string | undefined,
  code: string,
  type: OtpType = "login",
): Promise<{ valid: boolean; tempToken?: string; error?: string }> {
  const redis = getRedisClient();
  const key = `otp:${type}:${email || phone}`;
  const identifier = email || phone;

  if (!identifier) {
    return { valid: false, error: "Email or phone is required" };
  }

  const dataStr = await redis.get(key);
  if (!dataStr) {
    return { valid: false, error: "No OTP found. Please request a new one." };
  }

  const data = JSON.parse(dataStr) as OtpData;

  if (data.attempts >= MAX_ATTEMPTS) {
    await redis.del(key);
    return { valid: false, error: "Too many failed attempts. Please request a new OTP." };
  }

  if (code !== data.code) {
    data.attempts += 1;
    await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify(data));
    return {
      valid: false,
      error: `Invalid OTP. ${MAX_ATTEMPTS - data.attempts} attempts remaining.`,
    };
  }

  await redis.del(key);

  const tempToken = crypto.randomUUID();
  const tempKey = `otp_temp:${tempToken}`;
  await redis.setex(
    tempKey,
    600,
    JSON.stringify({
      email: data.email,
      phone: data.phone,
      type: data.type,
      used: false,
      createdAt: new Date().toISOString(),
    }),
  );

  return { valid: true, tempToken };
}

export async function validateOtpTempToken(
  tempToken: string,
  type?: OtpType,
): Promise<{ valid: boolean; email?: string; phone?: string; error?: string }> {
  const redis = getRedisClient();
  const key = `otp_temp:${tempToken}`;

  const dataStr = await redis.get(key);
  if (!dataStr) {
    return { valid: false, error: "Session expired. Please start again." };
  }

  const data = JSON.parse(dataStr) as {
    email?: string;
    phone?: string;
    type: OtpType;
    used: boolean;
  };
  if (data.used) {
    await redis.del(key);
    return { valid: false, error: "This link has already been used." };
  }

  if (type && data.type !== type) {
    return { valid: false, error: "Invalid OTP type for this operation." };
  }

  data.used = true;
  await redis.setex(key, 60, JSON.stringify(data));

  return { valid: true, email: data.email, phone: data.phone };
}

export async function invalidateOtpTempToken(tempToken: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`otp_temp:${tempToken}`);
}

export async function sendOtpViaEmail(
  email: string,
  code: string,
  type: OtpType,
): Promise<{ success: boolean; error?: string }> {
  const subject = getEmailSubject(type);
  const html = getEmailHtml(code, type);
  const text = getEmailText(code, type);

  try {
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
      to: email,
      subject,
      html,
      text,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function sendOtpViaWhatsApp(
  phone: string,
  code: string,
  type: OtpType,
): Promise<{ success: boolean; error?: string }> {
  const message = getWhatsAppMessage(phone, code, type);

  try {
    const whatsappApiUrl = process.env.WHATSAPP_API_URL || "http://localhost:9000/send";

    const response = await fetch(whatsappApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN || ""}`,
      },
      body: JSON.stringify({
        phone: normalizePhone(phone),
        message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP via WhatsApp:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp message",
    };
  }
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    return `62${cleaned.slice(1)}`;
  }
  if (!cleaned.startsWith("62") && !cleaned.startsWith("1")) {
    return `62${cleaned}`;
  }
  return cleaned;
}

function getEmailSubject(type: OtpType): string {
  switch (type) {
    case "login":
      return "Your Login Verification Code";
    case "password_reset":
      return "Password Reset Verification Code";
    case "email_verification":
      return "Verify Your Email Address";
    case "2fa_email":
      return "Your Two-Factor Authentication Code";
    default:
      return "Your Verification Code";
  }
}

function getEmailHtml(code: string, type: OtpType): string {
  const title = getEmailTitle(type);
  const description = getEmailDescription(type);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 480px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #4F46E5; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Support Portal</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">${title}</h2>
      <p style="margin: 0 0 24px; color: #6b7280; line-height: 1.5;">${description}</p>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
        <p style="margin: 8px 0 0; font-size: 36px; font-weight: 700; color: #111827; letter-spacing: 8px; font-variant-numeric: tabular-nums;">${code}</p>
      </div>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">This code will expire in 5 minutes. If you didn't request this, please ignore this email.</p>
    </div>
    <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
      &copy; ${new Date().getFullYear()} Support Portal. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

function getEmailText(code: string, type: OtpType): string {
  const title = getEmailTitle(type);
  const description = getEmailDescription(type);

  return `${title}

${description}

Your Verification Code: ${code}

This code will expire in 5 minutes. If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} Support Portal. All rights reserved.`;
}

function getEmailTitle(type: OtpType): string {
  switch (type) {
    case "login":
      return "Verify Your Login";
    case "password_reset":
      return "Reset Your Password";
    case "email_verification":
      return "Verify Your Email";
    case "2fa_email":
      return "Your Login Code";
    default:
      return "Your Verification Code";
  }
}

function getEmailDescription(type: OtpType): string {
  switch (type) {
    case "login":
      return "Enter the verification code below to complete your login. This helps keep your account secure.";
    case "password_reset":
      return "Enter the verification code below to reset your password. If you didn't request this, you can safely ignore this email.";
    case "email_verification":
      return "Enter the verification code below to verify your email address and activate your account.";
    case "2fa_email":
      return "Enter the 6-digit code below to complete your login. This code was sent to your registered email address.";
    default:
      return "Enter the verification code below.";
  }
}

function getWhatsAppMessage(_phone: string, code: string, type: OtpType): string {
  switch (type) {
    case "login":
      return `Hi! Your login verification code is: ${code}. This code expires in 5 minutes. If you didn't request this, please ignore this message.`;
    case "password_reset":
      return `Hi! Your password reset code is: ${code}. This code expires in 5 minutes. If you didn't request this, please ignore this message.`;
    case "email_verification":
      return `Hi! Your email verification code is: ${code}. This code expires in 5 minutes.`;
    case "2fa_email":
      return `Your 2FA code is: ${code}. Valid for 5 minutes.`;
    default:
      return `Your verification code is: ${code}. Valid for 5 minutes.`;
  }
}
