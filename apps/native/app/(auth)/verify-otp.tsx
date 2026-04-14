import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Link, Surface, Text, useThemeColor } from "heroui-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import * as SecureStore from "expo-secure-store";

import { orpc } from "~/utils/orpc";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    phone?: string;
    type: string;
    tempToken?: string;
  }>();

  const backgroundColor = useThemeColor("background");

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(any | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const verifyOtpMutation = useMutation(
    orpc.auth.verifyOtp.mutationOptions({
      onSuccess: (data) => {
        if (params.type === "password_reset") {
          router.replace({
            pathname: "/(auth)/reset-password",
            params: {
              email: params.email,
              tempToken: data.tempToken,
            },
          });
        } else if (params.type === "login") {
          completeLoginMutation.mutate({
            email: params.email!,
            tempToken: data.tempToken!,
          });
        }
      },
      onError: (err) => {
        setError(err.message);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      },
    }),
  );

  const completeLoginMutation = useMutation(
    orpc.auth.completeLoginWithOtp.mutationOptions({
      onSuccess: async (data) => {
        await SecureStore.setItemAsync("sessionToken", data.sessionToken);
        await SecureStore.setItemAsync("user", JSON.stringify(data.user));
        router.replace("/(drawer)");
      },
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  const resendMutation = useMutation(
    orpc.auth.sendOtp.mutationOptions({
      onSuccess: () => {
        setResendTimer(60);
        setError("");
      },
      onError: (err: any) => {
        setError(err.message);
      },
    }),
  );

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError("");

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (codeToVerify?: string) => {
    const finalCode = codeToVerify || code.join("");
    if (finalCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    verifyOtpMutation.mutate({
      email: params.email,
      phone: params.phone,
      code: finalCode,
      type: params.type as any,
    });
  };

  const handleResend = () => {
    if (resendTimer > 0) return;

    resendMutation.mutate({
      email: params.email,
      phone: params.phone,
      method: params.email ? "email" : "whatsapp",
      type: params.type as any,
    });
  };

  const getTitle = () => {
    switch (params.type) {
      case "login":
        return "Verify Your Login";
      case "password_reset":
        return "Reset Your Password";
      case "email_verification":
        return "Verify Your Email";
      case "totp":
        return "Authenticator Code";
      default:
        return "Enter Code";
    }
  };

  const getDescription = () => {
    switch (params.type) {
      case "login":
        return "Enter the 6-digit code sent to your email";
      case "password_reset":
        return "Enter the code to verify your identity";
      case "email_verification":
        return "Enter the code sent to your email";
      case "totp":
        return "Enter the code from your authenticator app";
      default:
        return "Enter the 6-digit code";
    }
  };

  const isPending = verifyOtpMutation.isPending || completeLoginMutation.isPending;

  return (
    <View style={{ backgroundColor, flex: 1 }}>
      <View className="flex-1 justify-center px-6 py-8">
        <View className="items-center mb-6">
          <Text className="text-2xl font-bold text-foreground mb-2">{getTitle()}</Text>
          <Text className="text-sm text-muted text-center">{getDescription()}</Text>
        </View>

        {error ? (
          <Surface variant="error" className="p-4 rounded-lg mb-4">
            <Text className="text-sm text-danger text-center">{error}</Text>
          </Surface>
        ) : null}

        <View className="flex-row justify-center gap-2 mb-6">
          {code.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              variant="bordered"
              value={digit}
              onChangeText={(v) => handleCodeChange(index, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              className="w-12 h-14 text-center text-xl font-bold"
              textAlign="center"
              isDisabled={isPending}
            />
          ))}
        </View>

        <Button
          color="primary"
          size="lg"
          onPress={() => handleVerify()}
          isLoading={isPending}
          isDisabled={code.some((d) => !d)}
        >
          {isPending ? "Verifying…" : "Verify"}
        </Button>

        <View className="flex-row justify-center mt-4">
          {resendTimer > 0 ? (
            <Text className="text-sm text-muted">
              Resend in <Text className="font-medium tabular-nums">{resendTimer}s</Text>
            </Text>
          ) : (
            <Button
              variant="light"
              size="sm"
              onPress={handleResend}
              isLoading={resendMutation.isPending}
            >
              <Text className="text-sm text-primary">Resend code</Text>
            </Button>
          )}
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
    </View>
  );
}
