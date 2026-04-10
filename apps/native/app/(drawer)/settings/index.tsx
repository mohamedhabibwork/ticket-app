import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Surface, Text, useThemeColor } from "heroui-native";
import { View, Pressable, Alert } from "react-native";

import { Container } from "@/components/container";

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  danger?: boolean;
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  danger = false,
}: SettingsItemProps) {
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  return (
    <Pressable onPress={onPress}>
      <Surface variant="secondary" className="p-4 rounded-lg mb-2">
        <View className="flex-row items-center gap-3">
          <Ionicons name={icon as any} size={22} color={danger ? "#ef4444" : foregroundColor} />
          <View className="flex-1">
            <Text className={danger ? "text-danger font-medium" : "text-foreground font-medium"}>
              {title}
            </Text>
            {subtitle && <Text className="text-muted text-xs mt-0.5">{subtitle}</Text>}
          </View>
          {showArrow && <Ionicons name="chevron-forward" size={20} color={mutedColor} />}
        </View>
      </Surface>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const _mutedColor = useThemeColor("muted");

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          // Handle logout logic here
        },
      },
    ]);
  };

  return (
    <Container>
      <View className="p-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-4">Settings</Text>

        <Text className="text-muted text-xs font-medium mb-2 px-1">ACCOUNT</Text>
        <SettingsItem
          icon="person-outline"
          title="Profile"
          subtitle="Manage your profile information"
          onPress={() => router.push("/profile")}
        />

        <Text className="text-muted text-xs font-medium mb-2 px-1 mt-4">PREFERENCES</Text>
        <SettingsItem
          icon="key-outline"
          title="Security"
          subtitle="Password and authentication"
          onPress={() => router.push("/settings/security")}
        />
        <SettingsItem
          icon="notifications-outline"
          title="Notifications"
          subtitle="Manage notification preferences"
          onPress={() => router.push("/settings/notifications")}
        />
        <SettingsItem
          icon="color-palette-outline"
          title="Appearance"
          subtitle="Theme and display settings"
          onPress={() => {}}
        />

        <Text className="text-muted text-xs font-medium mb-2 px-1 mt-4">SUPPORT</Text>
        <SettingsItem
          icon="help-circle-outline"
          title="Help Center"
          subtitle="Get help and support"
          onPress={() => router.push("/kb")}
        />
        <SettingsItem icon="document-text-outline" title="Terms of Service" onPress={() => {}} />
        <SettingsItem icon="shield-outline" title="Privacy Policy" onPress={() => {}} />

        <Text className="text-muted text-xs font-medium mb-2 px-1 mt-4">DANGER ZONE</Text>
        <SettingsItem
          icon="log-out-outline"
          title="Logout"
          subtitle="Sign out of your account"
          onPress={handleLogout}
          danger
        />
      </View>
    </Container>
  );
}
