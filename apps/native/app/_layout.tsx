import "@/polyfills";
import "@/global.css";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SecureStore from "expo-secure-store";

import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { queryClient, orpc } from "~/utils/orpc";

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated: _isAuthenticated, isLoading: authLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return;

      try {
        const sessionToken = await SecureStore.getItemAsync("sessionToken");
        const isAuthRoute = segments[0] === "(auth)";

        if (!sessionToken && !isAuthRoute) {
          router.replace("/(auth)/login");
        } else if (sessionToken && isAuthRoute) {
          try {
            await orpc.orpc.auth.me.query({});
            router.replace("/(drawer)");
          } catch {
            await SecureStore.deleteItemAsync("sessionToken");
            await SecureStore.deleteItemAsync("user");
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [segments, authLoading]);

  if (isChecking || authLoading) {
    return null;
  }

  return <>{children}</>;
}

function StackLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <AuthProvider>
                <AuthGuard>
                  <StackLayout />
                </AuthGuard>
              </AuthProvider>
            </HeroUINativeProvider>
          </AppThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
