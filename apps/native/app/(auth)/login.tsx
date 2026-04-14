import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Link, Surface, Text, useThemeColor } from "heroui-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { useAuth } from "@/contexts/auth-context";
import { orpc } from "~/utils/orpc";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const foregroundColor = useThemeColor("foreground");
  const mutedColor = useThemeColor("muted");
  const backgroundColor = useThemeColor("background");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useMutation(
    orpc.auth.login.mutationOptions({
      onSuccess: async (data) => {
        if (data.requires2FA) {
          router.push({
            pathname: "/(auth)/verify-otp",
            params: {
              email,
              type: data.requiresEmailOtp ? "login" : "totp",
              tempToken: data.tempToken || "",
            },
          });
        } else {
          await login({ sessionToken: data.sessionToken, user: data.user });
          router.replace("/(drawer)");
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  const handleLogin = () => {
    setError("");
    loginMutation.mutate({
      email,
      password,
    });
  };

  const handleSendOtp = () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    router.push({
      pathname: "/(auth)/verify-otp",
      params: {
        email,
        type: "login",
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ backgroundColor }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-8">
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-foreground mb-2">Customer Portal</Text>
            <Text className="text-base text-muted">Sign in to manage your tickets</Text>
          </View>

          {error ? (
            <Surface variant="error" className="p-4 rounded-lg mb-4">
              <Text className="text-sm text-danger">{error}</Text>
            </Surface>
          ) : null}

          <View className="gap-4">
            <Input
              variant="bordered"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              startContent={<Ionicons name="mail-outline" size={20} color={mutedColor} />}
            />

            <Input
              variant="bordered"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
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

            <View className="flex-row justify-end">
              <Link href="/(auth)/forgot-password">
                <Text className="text-sm text-primary">Forgot password?</Text>
              </Link>
            </View>

            <Button
              color="primary"
              size="lg"
              onPress={handleLogin}
              isLoading={loginMutation.isPending}
              isDisabled={!email || !password}
            >
              {loginMutation.isPending ? "Signing in…" : "Sign In"}
            </Button>

            <View className="flex-row items-center gap-4 my-2">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-xs text-muted">OR</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            <Button variant="bordered" size="lg" onPress={handleSendOtp}>
              <Ionicons name="mail-outline" size={20} color={foregroundColor} />
              <Text className="ml-2">Sign in with Email Code</Text>
            </Button>

            <View className="flex-row justify-center mt-4">
              <Text className="text-sm text-muted">Don&apos;t have an account? </Text>
              <Link href="/(auth)/register">
                <Text className="text-sm text-primary font-medium">Create one</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
