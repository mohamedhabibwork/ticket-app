"use client";

export interface BrandingConfig {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  fontFamily?: string | null;
  customCss?: string | null;
  loginBgUrl?: string | null;
  loginHeadline?: string | null;
  hideVendorBranding: boolean;
  portalHeaderHtml?: string | null;
  portalFooterHtml?: string | null;
  emailLogoUrl?: string | null;
  emailHeaderColor?: string | null;
  emailFooterText?: string | null;
}

export interface OrganizationBranding {
  organizationId: number;
  organizationName: string;
  organizationSlug: string;
  subdomain?: string | null;
  customDomain?: string | null;
  branding: BrandingConfig | null;
}

export function applyBrandingToDOM(branding: BrandingConfig): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (branding.primaryColor) {
    root.style.setProperty("--brand-primary", branding.primaryColor);
  }
  if (branding.secondaryColor) {
    root.style.setProperty("--brand-secondary", branding.secondaryColor);
  }
  if (branding.backgroundColor) {
    root.style.setProperty("--brand-background", branding.backgroundColor);
  }
  if (branding.fontFamily) {
    root.style.setProperty("--brand-font-family", branding.fontFamily);
  }

  if (branding.customCss) {
    let styleEl = document.getElementById("custom-branding-css");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "custom-branding-css";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = branding.customCss;
  }
}

export function injectFavicon(faviconUrl: string | null | undefined): void {
  if (typeof document === "undefined") return;

  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (existing) {
    existing.href = faviconUrl || "/favicon.ico";
  } else if (faviconUrl) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = faviconUrl;
    document.head.appendChild(link);
  }
}

export function injectLoginBranding(branding: BrandingConfig): void {
  if (typeof document === "undefined") return;

  if (branding.loginBgUrl) {
    document.body.style.setProperty("--login-bg-url", `url(${branding.loginBgUrl})`);
  }
}

export function buildEmailHeaderHtml(branding: BrandingConfig): string {
  if (branding.portalHeaderHtml) {
    return branding.portalHeaderHtml;
  }

  const logoUrl = branding.emailLogoUrl || branding.logoUrl;
  const headerColor = branding.emailHeaderColor || branding.primaryColor || "#2563eb";

  if (!logoUrl) {
    return `<div style="background-color: ${headerColor}; padding: 20px; text-align: center; color: white;">
      <strong>Support</strong>
    </div>`;
  }

  return `<div style="background-color: ${headerColor}; padding: 20px; text-align: center;">
    <img src="${logoUrl}" alt="Logo" style="max-height: 40px;">
  </div>`;
}

export function buildEmailFooterHtml(branding: BrandingConfig): string {
  if (branding.portalFooterHtml) {
    return branding.portalFooterHtml;
  }

  const footerText = branding.emailFooterText || "This email was sent by our support platform.";

  return `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
    <p>${footerText}</p>
    ${branding.hideVendorBranding ? "" : "<p>Powered by Support Platform</p>"}
  </div>`;
}
