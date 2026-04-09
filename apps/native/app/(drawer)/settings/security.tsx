import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Divider,
  Spinner,
  Surface,
  Text,
  TextField,
  Input,
  useThemeColor,
} from "heroui-native";
import { useState } from "react";
import { View, Alert, ScrollView } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact, hapticNotification } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function SecuritySettingsScreen() {
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useMutation(
    orpc.users.changePassword.mutationOptions({
      onSuccess: () => {
        hapticNotification("success");
        Alert.alert("Success", "Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      },
      onError: (error) => {
        hapticNotification("error");
        Alert.alert("Error", error.message || "Failed to change password");
      },
    }),
  );

  const enable2FAMutation = useMutation(orpc.users.enable2FA.mutationOptions());
  const disable2FAMutation = useMutation(orpc.users.disable2FA.mutationOptions());

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      hapticNotification("error");
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      hapticNotification("error");
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    hapticImpact("medium");
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleToggle2FA = (enable: boolean) => {
    hapticImpact("medium");
    if (enable) {
      enable2FAMutation.mutate(undefined, {
        onSuccess: (data) => {
          hapticNotification("success");
          Alert.alert(
            "2FA Enabled",
            `Your 2FA secret has been generated. Save this backup code: ${data.backupCode}`,
          );
        },
      });
    } else {
      disable2FAMutation.mutate(undefined, {
        onSuccess: () => {
          hapticNotification("success");
          Alert.alert("Success", "2FA has been disabled");
        },
      });
    }
  };

  return (
    <Container>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          Security
        </Text>
        <Text className="text-muted text-sm mb-4">Manage your account security</Text>

        <Text className="text-muted text-xs font-medium mb-2 px-1">CHANGE PASSWORD</Text>
        <Surface variant="secondary" className="p-4 rounded-lg mb-4">
          <Text className="text-foreground font-medium mb-3">Change Password</Text>

          <TextField className="mb-3">
            <Input
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              secureTextEntry
            />
          </TextField>

          <TextField className="mb-3">
            <Input
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              secureTextEntry
            />
          </TextField>

          <TextField className="mb-3">
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
            />
          </TextField>

          <Button
            variant="primary"
            onPress={handleChangePassword}
            isDisabled={
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              changePasswordMutation.isPending
            }
          >
            {changePasswordMutation.isPending ? (
              <Spinner size="sm" />
            ) : (
              <Text className="text-foreground font-medium">Update Password</Text>
            )}
          </Button>
        </Surface>

        <Text className="text-muted text-xs font-medium mb-2 px-1">TWO-FACTOR AUTHENTICATION</Text>
        <Surface variant="secondary" className="p-4 rounded-lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="shield-checkmark" size={20} color={foregroundColor} />
                <Text className="text-foreground font-medium">2FA Status</Text>
              </View>
              <Text className="text-muted text-xs mt-0.5">
                Add an extra layer of security to your account
              </Text>
            </View>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => handleToggle2FA(true)}
            >
              <Ionicons name="key-outline" size={16} color={foregroundColor} />
              <Text className="ml-1 text-sm">Enable</Text>
            </Button>
          </View>
        </Surface>

        <Surface variant="tertiary" className="p-4 rounded-lg mt-4">
          <View className="flex-row items-start gap-2">
            <Ionicons name="information-circle-outline" size={18} color={mutedColor} />
            <Text className="text-muted text-xs flex-1">
              Two-factor authentication adds an extra layer of security to your account by
              requiring a code from your authenticator app in addition to your password.
            </Text>
          </View>
        </Surface>
      </ScrollView>
    </Container>
  );
}
