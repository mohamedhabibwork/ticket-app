import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Link, Surface, Text, useThemeColor } from "heroui-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { orpc } from "~/utils/orpc";
import { useOrganization } from "@/hooks/useOrganization";

export default function RegisterScreen() {
  const { organizationId } = useOrganization();
  const router = useRouter();
  const mutedColor = useThemeColor("muted");
  const backgroundColor = useThemeColor("background");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const registerMutation = useMutation(
    orpc.auth.register.mutationOptions({
      onSuccess: () => {
        router.replace("/(drawer)");
      },
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = () => {
    setError("");

    if (!formData.firstName.trim()) {
      setError("First name is required");
      return;
    }

    if (!formData.lastName.trim()) {
      setError("Last name is required");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    registerMutation.mutate({
      organizationId,
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6 py-8">
          <View className="items-center mb-6">
            <Text className="text-2xl font-bold text-foreground mb-2">Create Account</Text>
            <Text className="text-sm text-muted text-center">
              Enter your details to get started
            </Text>
          </View>

          {error ? (
            <Surface variant="error" className="p-4 rounded-lg mb-4">
              <Text className="text-sm text-danger text-center">{error}</Text>
            </Surface>
          ) : null}

          <View className="gap-4">
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Input
                  variant="bordered"
                  label="First Name"
                  placeholder="John"
                  value={formData.firstName}
                  onChangeText={(v) => handleChange("firstName", v)}
                  autoComplete="given-name"
                />
              </View>
              <View className="flex-1">
                <Input
                  variant="bordered"
                  label="Last Name"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChangeText={(v) => handleChange("lastName", v)}
                  autoComplete="family-name"
                />
              </View>
            </View>

            <Input
              variant="bordered"
              label="Email"
              placeholder="you@example.com"
              value={formData.email}
              onChangeText={(v) => handleChange("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              startContent={<Ionicons name="mail-outline" size={20} color={mutedColor} />}
            />

            <Input
              variant="bordered"
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(v) => handleChange("password", v)}
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
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(v) => handleChange("confirmPassword", v)}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              startContent={<Ionicons name="lock-closed-outline" size={20} color={mutedColor} />}
            />

            <Button
              color="primary"
              size="lg"
              onPress={handleSubmit}
              isLoading={registerMutation.isPending}
              isDisabled={
                !formData.firstName ||
                !formData.lastName ||
                !formData.email ||
                !formData.password ||
                !formData.confirmPassword
              }
            >
              {registerMutation.isPending ? "Creating account…" : "Create Account"}
            </Button>

            <View className="flex-row justify-center mt-4">
              <Text className="text-sm text-muted">Already have an account? </Text>
              <Link href="/(auth)/login">
                <Text className="text-sm text-primary font-medium">Sign in</Text>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
