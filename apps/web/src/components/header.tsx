import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n, useDirection } from "@ticket-app/ui/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { ModeToggle } from "./mode-toggle";
import { Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { Button } from "@ticket-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Avatar } from "@ticket-app/ui/components/avatar";

export default function Header() {
  const { t } = useI18n();
  const { direction: _direction, isRTL } = useDirection();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading: _isLoading } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      toast.error("Failed to logout");
    }
  };

  const getInitials = () => {
    if (!user) return "?";
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  };

  const navItems = [
    { to: "/dashboard", label: t("nav.dashboard") },
    { to: "/tickets", label: t("nav.tickets") },
    { to: "/contacts", label: t("nav.contacts") },
    { to: "/settings", label: t("nav.settings") },
  ];

  return (
    <div className="border-b border-border">
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-xl font-bold">
            Support
          </Link>
          {isAuthenticated && (
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
          )}
        </div>

        <div
          className={`
            hidden md:flex items-center gap-3
            ${isRTL ? "flex-row-reverse" : "flex-row"}
          `}
        >
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8" fallback={getInitials()} />
                  <span className="text-sm font-medium">
                    {user.firstName} {user.lastName?.[0]}.
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/settings/profile" })}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/portal/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/portal/register">
                <Button size="sm">Register</Button>
              </Link>
            </div>
          )}
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
            {isAuthenticated &&
              navItems.map(({ to, label }) => (
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
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
