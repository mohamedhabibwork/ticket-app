import { refreshFacebookToken } from "./social/facebook";
import { refreshTwitterToken } from "./social/twitter";

export interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export async function refreshSocialToken(
  platform: string,
  refreshToken: string,
): Promise<RefreshedTokens> {
  switch (platform) {
    case "facebook":
    case "instagram": {
      const tokens = await refreshFacebookToken(refreshToken);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    }
    case "twitter": {
      const tokens = await refreshTwitterToken(refreshToken);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function validateSocialToken(platform: string, accessToken: string): Promise<boolean> {
  return !!accessToken;
}
