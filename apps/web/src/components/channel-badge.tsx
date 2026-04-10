import {
  Mail,
  MessageSquare,
  Globe,
  Facebook,
  Twitter,
  MessageCircle,
  Instagram,
  Phone,
  Users,
  ShoppingCart,
} from "lucide-react";

export type ChannelType =
  | "email"
  | "chat"
  | "form"
  | "social"
  | "api"
  | "facebook"
  | "instagram"
  | "twitter"
  | "whatsapp"
  | "phone"
  | "ecommerce";

interface ChannelBadgeProps {
  channel: ChannelType | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const channelConfig: Record<string, { icon: typeof Mail; color: string; label: string }> = {
  email: {
    icon: Mail,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Email",
  },
  chat: {
    icon: MessageSquare,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    label: "Chat",
  },
  form: {
    icon: Globe,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    label: "Form",
  },
  social: {
    icon: Users,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    label: "Social",
  },
  api: {
    icon: Phone,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    label: "API",
  },
  facebook: {
    icon: Facebook,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Facebook",
  },
  instagram: {
    icon: Instagram,
    color: "bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 text-white",
    label: "Instagram",
  },
  twitter: {
    icon: Twitter,
    color: "bg-black text-white dark:bg-gray-800",
    label: "Twitter",
  },
  whatsapp: {
    icon: MessageCircle,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    label: "WhatsApp",
  },
  phone: {
    icon: Phone,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    label: "Phone",
  },
  ecommerce: {
    icon: ShoppingCart,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    label: "eCommerce",
  },
};

const sizeClasses = {
  sm: {
    badge: "px-1.5 py-0.5 rounded text-xs gap-1",
    icon: "w-3 h-3",
  },
  md: {
    badge: "px-2 py-1 rounded-md text-sm gap-1.5",
    icon: "w-4 h-4",
  },
  lg: {
    badge: "px-3 py-1.5 rounded-lg text-base gap-2",
    icon: "w-5 h-5",
  },
};

export function ChannelBadge({
  channel,
  size = "md",
  showLabel = true,
  className = "",
}: ChannelBadgeProps) {
  const config = channelConfig[channel.toLowerCase()] || {
    icon: Globe,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    label: channel,
  };

  const Icon = config.icon;
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`inline-flex items-center ${sizeClass.badge} ${config.color} ${className}`}
      title={config.label}
    >
      <Icon className={sizeClass.icon} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface ChannelIconProps {
  channel: ChannelType | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ChannelIcon({ channel, size = "md", className = "" }: ChannelIconProps) {
  const config = channelConfig[channel.toLowerCase()] || {
    icon: Globe,
    color: "text-gray-400",
    label: channel,
  };

  const Icon = config.icon;

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return <Icon className={`${iconSizes[size]} ${config.color} ${className}`} />;
}

interface SocialPlatformBadgeProps {
  platform: "facebook" | "instagram" | "twitter" | "whatsapp";
  username?: string | null;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const socialPlatformConfig = {
  facebook: {
    icon: Facebook,
    gradient: "bg-blue-600",
    label: "Facebook",
  },
  instagram: {
    icon: Instagram,
    gradient: "bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400",
    label: "Instagram",
  },
  twitter: {
    icon: Twitter,
    gradient: "bg-black",
    label: "Twitter/X",
  },
  whatsapp: {
    icon: MessageCircle,
    gradient: "bg-green-500",
    label: "WhatsApp",
  },
};

export function SocialPlatformBadge({
  platform,
  username,
  size = "md",
  showIcon = true,
  className = "",
}: SocialPlatformBadgeProps) {
  const config = socialPlatformConfig[platform];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} text-white ${className}`}
      style={{ background: config.gradient }}
      title={`${config.label}${username ? `: @${username}` : ""}`}
    >
      {showIcon && (
        <Icon className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
      )}
      {username && <span>@{username}</span>}
    </span>
  );
}

interface ConnectionStatusProps {
  isActive: boolean;
  _lastSyncAt?: string | Date | null;
  className?: string;
}

export function ConnectionStatus({ isActive, _lastSyncAt, className = "" }: ConnectionStatusProps) {
  if (isActive) {
    return (
      <span className={`inline-flex items-center gap-1 text-green-600 ${className}`}>
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs">Connected</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-red-600 ${className}`}>
      <span className="w-2 h-2 bg-red-500 rounded-full" />
      <span className="text-xs">Disconnected</span>
    </span>
  );
}

interface MessageDirectionProps {
  isIncoming: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function MessageDirection({
  isIncoming,
  size = "md",
  className = "",
}: MessageDirectionProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  if (isIncoming) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-blue-600 ${className}`}
        title="Received"
      >
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10l9-9m0 0l9 9m-9-9v18"
          />
        </svg>
        {size === "md" && <span className="text-xs">In</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-green-600 ${className}`} title="Sent">
      <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 10l-9-9m0 0l9-9m-9 9v18"
        />
      </svg>
      {size === "md" && <span className="text-xs">Out</span>}
    </span>
  );
}
