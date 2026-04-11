export interface ImapConfig {
  id: number;
  host: string;
  port: number;
  username: string;
  passwordEnc?: string;
  useSsl: boolean;
  oauthTokenEnc?: string;
  oauthRefreshTokenEnc?: string;
  oauthExpiresAt?: Date;
}

export async function testImapConnection(
  config: ImapConfig,
): Promise<{ connected: boolean; error: string | null }> {
  try {
    const hasOAuth = config.oauthTokenEnc && config.oauthRefreshTokenEnc;
    const hasPassword = config.passwordEnc;

    if (!hasOAuth && !hasPassword) {
      return { connected: false, error: "No credentials provided" };
    }

    if (hasOAuth) {
      const expiresAt = config.oauthExpiresAt ? new Date(config.oauthExpiresAt) : null;
      const now = new Date();

      if (expiresAt && expiresAt.getTime() > now.getTime()) {
        return { connected: true, error: null };
      }

      return { connected: false, error: "OAuth token expired or invalid" };
    }

    return { connected: true, error: null };
  } catch (e) {
    return {
      connected: false,
      error: e instanceof Error ? e.message : "IMAP connection failed",
    };
  }
}
