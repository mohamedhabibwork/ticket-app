import { Link } from "@tanstack/react-router";
import { useI18n, useDirection } from "@/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { ModeToggle } from "./mode-toggle";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { t } = useI18n();
  const { direction: _direction, isRTL } = useDirection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/", label: t("nav.dashboard") },
    { to: "/tickets", label: t("nav.tickets") },
    { to: "/contacts", label: t("nav.contacts") },
    { to: "/reports", label: t("nav.reports") },
    { to: "/settings", label: t("nav.settings") },
  ] as const;

  return (
    <div className="border-b border-border">
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold">
            Support
          </Link>
          <nav
            className={`
              hidden md:flex gap-1
              ${isRTL ? "flex-row-reverse" : "flex-row"}
            `}
          >
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium
                  hover:bg-accent transition-colors
                  ${isRTL ? "text-right" : "text-left"}
                `}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div
          className={`
            hidden md:flex items-center gap-3
            ${isRTL ? "flex-row-reverse" : "flex-row"}
          `}
        >
          <LanguageSwitcher />
          <ModeToggle />
        </div>

        <button
          className="md:hidden p-2 hover:bg-accent rounded-md"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border p-4">
          <nav
            className={`
              flex flex-col gap-2
              ${isRTL ? "text-right" : "text-left"}
            `}
          >
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div
            className={`
              flex items-center gap-3 mt-4 pt-4 border-t border-border
              ${isRTL ? "flex-row-reverse" : "flex-row"}
            `}
          >
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
