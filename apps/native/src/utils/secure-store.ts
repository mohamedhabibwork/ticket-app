import * as SecureStore from "expo-secure-store";

export function getExpoSecureStore() {
  return SecureStore;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("auth_token");
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync("auth_token", token);
}

export async function removeAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync("auth_token");
}
