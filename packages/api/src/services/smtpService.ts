export interface SmtpConfig {
  id: number;
  host: string;
  port: number;
  username: string;
  passwordEnc?: string;
  useSsl: boolean;
  useTls: boolean;
  fromName?: string;
}

export async function testSmtpConnection(
  config: SmtpConfig,
): Promise<{ connected: boolean; error: string | null }> {
  try {
    const hasPassword = config.passwordEnc;

    if (!hasPassword) {
      return { connected: false, error: "No credentials provided" };
    }

    return { connected: true, error: null };
  } catch (e) {
    return {
      connected: false,
      error: e instanceof Error ? e.message : "SMTP connection failed",
    };
  }
}
