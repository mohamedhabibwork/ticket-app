import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Link, Surface, Text, useThemeColor } from "heroui-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { orpc } from "~/utils/orpc";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const mutedColor = useThemeColor("muted");
  const backgroundColor = useThemeColor("background");

  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");

  const sendOtpMutation = useMutation(
    orpc.auth.sendOtp.mutationOptions({
      onSuccess: () => {
        setSent(true);
      },
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  const handleSend = () => {
    setError("");
    const target = method === "email" ? email : phone;
    if (!target) {
      setError(`Please enter your ${method === "email" ? "email" : "phone number"}`);
      return;
    }

    setSentTo(target);
    sendOtpMutation.mutate({
      email: method === "email" ? email : undefined,
      phone: method === "whatsapp" ? phone : undefined,
      method,
      type: "password_reset",
    });
  };

  if (sent) {
    return (
      <ScrollView style={{ backgroundColor }} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6 py-8">
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-success-100 items-center justify-center mb-4">
              <Ionicons name="mail-check-outline" size={32} color="#22c55e" />
            </View>
            <Text className="text-xl font-semibold text-foreground mb-2">
              Check Your {method === "email" ? "Email" : "Phone"}
            </Text>
            <Text className="text-sm text-muted text-center">
              We sent a verification code to {sentTo}
            </Text>
          </View>

          <Surface className="p-4 rounded-lg mb-6" style={{ backgroundColor: "#fef3c7" }}>
            <Text className="text-sm text-amber-800 text-center">
              Enter the 6-digit code to reset your password
            </Text>
          </Surface>

          <Button
            color="primary"
            size="lg"
            onPress={() => {
              router.push({
                pathname: "/(auth)/verify-otp",
                params: {
                  email: method === "email" ? email : undefined,
                  phone: method === "whatsapp" ? phone : undefined,
                  type: "password_reset",
                },
              });
            }}
          >
            Enter Code
          </Button>

          <View className="flex-row justify-center mt-4">
            <Text className="text-sm text-muted">Didn&apos;t receive it? </Text>
            <Button
              variant="light"
              size="sm"
              isLoading={sendOtpMutation.isPending}
              onPress={handleSend}
            >
              <Text className="text-sm text-primary">Resend</Text>
            </Button>
          </View>

          <View className="flex-row justify-center mt-6">
            <Link href="/(auth)/login">
              <View className="flex-row items-center gap-1">
                <Ionicons name="arrow-back-outline" size={16} color="#4F46E5" />
                <Text className="text-sm text-primary">Back to sign in</Text>
              </View>
            </Link>
          </View>
        </View>
      </ScrollView>
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
            <Text className="text-2xl font-bold text-foreground mb-2">Reset Password</Text>
            <Text className="text-sm text-muted text-center">
              Enter your email or phone and we&apos;ll send you a code
            </Text>
          </View>

          {error ? (
            <Surface className="p-4 rounded-lg mb-4" style={{ backgroundColor: "#fee2e2" }}>
              <Text className="text-sm text-danger text-center">{error}</Text>
            </Surface>
          ) : null}

          <View className="gap-4">
            <View className="flex-row gap-2">
              <Button
                variant={method === "email" ? "solid" : "bordered"}
                color={method === "email" ? "primary" : "default"}
                className="flex-1"
                onPress={() => setMethod("email")}
              >
                <Ionicons name="mail-outline" size={18} />
                <Text className="ml-2">Email</Text>
              </Button>
              <Button
                variant={method === "whatsapp" ? "solid" : "bordered"}
                color={method === "whatsapp" ? "success" : "default"}
                className="flex-1"
                onPress={() => setMethod("whatsapp")}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={18}
                  color={method === "whatsapp" ? "white" : "#22c55e"}
                />
                <Text className={`ml-2 ${method === "whatsapp" ? "text-white" : ""}`}>
                  WhatsApp
                </Text>
              </Button>
            </View>

            {method === "email" ? (
              <Input
                variant="bordered"
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                startContent={<Ionicons name="mail-outline" size={20} color={mutedColor} />}
              />
            ) : (
              <Input
                variant="bordered"
                label="Phone number"
                placeholder="+62 812 3456 7890"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                startContent={<Ionicons name="call-outline" size={20} color={mutedColor} />}
              />
            )}

            <Button
              color="primary"
              size="lg"
              onPress={handleSend}
              isLoading={sendOtpMutation.isPending}
              isDisabled={method === "email" ? !email : !phone}
            >
              {sendOtpMutation.isPending ? "Sending…" : "Send Verification Code"}
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
