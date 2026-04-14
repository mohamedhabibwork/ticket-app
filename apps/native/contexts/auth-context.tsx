import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import * as orpc from "~/utils/orpc";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number;
  roles: { id: number; name: string; slug: string }[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (params: { sessionToken: string; user: User }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionToken = await SecureStore.getItemAsync("sessionToken");
        const userJson = await SecureStore.getItemAsync("user");

        if (sessionToken && userJson) {
          const userData = JSON.parse(userJson) as User;
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async ({ sessionToken, user: userData }: { sessionToken: string; user: User }) => {
    await SecureStore.setItemAsync("sessionToken", sessionToken);
    await SecureStore.setItemAsync("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await orpc.orpc.auth.logout.mutate({});
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      await SecureStore.deleteItemAsync("sessionToken");
      await SecureStore.deleteItemAsync("user");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
