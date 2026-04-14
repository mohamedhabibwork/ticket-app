import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Link, Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { orpc } from "~/utils/orpc";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    tempToken?: string;
  }>();

  const mutedColor = useThemeColor("muted");
  const backgroundColor = useThemeColor("background");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const resetMutation = useMutation(
    orpc.auth.resetPasswordWithOtp.mutationOptions({
      onSuccess: () => {
        setSuccess(true);
        setTimeout(() => {
          router.replace("/(auth)/login");
        }, 2000);
      },
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  const handleSubmit = () => {
    setError("");

    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!params.tempToken) {
      setError("Invalid reset session. Please start again.");
      return;
    }

    resetMutation.mutate({
      email: params.email!,
      tempToken: params.tempToken!,
      newPassword: password,
    });
  };

  if (success) {
    return (
      <View style={{ backgroundColor, flex: 1 }}>
        <View className="flex-1 justify-center px-6 py-8">
          <View className="items-center">
            <View className="w-16 h-16 rounded-full bg-success-100 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle-outline" size={32} color="#22c55e" />
            </View>
            <Text className="text-xl font-semibold text-foreground mb-2">
              Password Reset Complete
            </Text>
            <Text className="text-sm text-muted text-center mb-6">
              Your password has been reset successfully.
            </Text>
            <Spinner size="lg" />
            <Text className="text-sm text-muted mt-4">Redirecting to sign in…</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6 py-8">
          <View className="items-center mb-6">
            <Text className="text-2xl font-bold text-foreground mb-2">Set New Password</Text>
            <Text className="text-sm text-muted text-center">
              Create a new password for your account
            </Text>
          </View>

          {error ? (
            <Surface variant="error" className="p-4 rounded-lg mb-4">
              <Text className="text-sm text-danger text-center">{error}</Text>
            </Surface>
          ) : null}

          <View className="gap-4">
            <Input
              variant="bordered"
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              startContent={<Ionicons name="lock-closed-outline" size={20} color={mutedColor} />}
              endContent={
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={mutedColor}
                  />
                </Button>
              }
            />
            <Text className="text-xs text-muted -mt-2 px-1">
              At least 8 characters with uppercase, lowercase, and number
            </Text>

            <Input
              variant="bordered"
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              startContent={<Ionicons name="lock-closed-outline" size={20} color={mutedColor} />}
            />

            <Button
              color="primary"
              size="lg"
              onPress={handleSubmit}
              isLoading={resetMutation.isPending}
              isDisabled={!password || !confirmPassword}
            >
              {resetMutation.isPending ? "Resetting…" : "Reset Password"}
            </Button>

            <View className="flex-row justify-center mt-4">
              <Link href="/(auth)/login">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="arrow-back-outline" size={16} color="#4F46E5" />
                  <Text className="text-sm text-primary">Back to sign in</Text>
                </View>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
