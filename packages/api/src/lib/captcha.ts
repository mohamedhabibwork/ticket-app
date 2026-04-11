export type CaptchaProvider = "hcaptcha" | "recaptcha_v3";

export interface CaptbotVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  score?: number;
}

export interface CaptchaVerifyResult {
  success: boolean;
  errorCodes?: string[];
  score?: number;
}

async function verifyHCaptcha(
  secret: string,
  response: string,
  remoteip?: string,
): Promise<CaptchaVerifyResult> {
  const body = new URLSearchParams({
    secret,
    response,
    ...(remoteip && { remoteip }),
  });

  const res = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as CaptbotVerifyResponse;
  return {
    success: data.success,
    errorCodes: data["error-codes"],
  };
}

async function verifyRecaptchaV3(
  secret: string,
  response: string,
  remoteip?: string,
): Promise<CaptchaVerifyResult> {
  const body = new URLSearchParams({
    secret,
    response,
    ...(remoteip && { remoteip }),
  });

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as CaptbotVerifyResponse;
  return {
    success: data.success,
    errorCodes: data["error-codes"],
    score: data.score,
  };
}

export async function verifyCaptcha(
  provider: CaptchaProvider,
  secret: string,
  response: string,
  remoteip?: string,
  minScore?: number,
): Promise<CaptchaVerifyResult> {
  if (!secret || !response) {
    return { success: false, errorCodes: ["missing-input"] };
  }

  const result =
    provider === "hcaptcha"
      ? await verifyHCaptcha(secret, response, remoteip)
      : await verifyRecaptchaV3(secret, response, remoteip);

  if (minScore !== undefined && result.score !== undefined && result.score < minScore) {
    return { success: false, errorCodes: ["score-too-low"] };
  }

  return result;
}

export function evaluateCondition(
  condition: { field: string; operator: string; value?: string },
  fieldValues: Record<string, string>,
): boolean {
  const fieldValue = fieldValues[condition.field] ?? "";
  const condValue = condition.value ?? "";

  switch (condition.operator) {
    case "equals":
      return fieldValue === condValue;
    case "not_equals":
      return fieldValue !== condValue;
    case "contains":
      return fieldValue.toLowerCase().includes(condValue.toLowerCase());
    case "not_contains":
      return !fieldValue.toLowerCase().includes(condValue.toLowerCase());
    case "is_empty":
      return fieldValue === "" || fieldValue === undefined;
    case "is_not_empty":
      return fieldValue !== "" && fieldValue !== undefined;
    default:
      return true;
  }
}

export function evaluateConditionalLogic(
  logic:
    | {
        operator: "AND" | "OR";
        conditions: Array<{ field: string; operator: string; value?: string }>;
      }
    | null
    | undefined,
  fieldValues: Record<string, string>,
): boolean {
  if (!logic || !logic.conditions || logic.conditions.length === 0) {
    return true;
  }

  const results = logic.conditions.map((c) => evaluateCondition(c, fieldValues));

  if (logic.operator === "AND") {
    return results.every(Boolean);
  } else {
    return results.some(Boolean);
  }
}
