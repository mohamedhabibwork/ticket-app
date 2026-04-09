import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function hapticImpact(style: "light" | "medium" | "heavy" = "medium") {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    const feedbackStyle = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    }[style];
    Haptics.impactAsync(feedbackStyle);
  }
}

export function hapticNotification(type: "success" | "warning" | "error" = "success") {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    const feedbackType = {
      success: Haptics.NotificationFeedbackType.Success,
      warning: Haptics.NotificationFeedbackType.Warning,
      error: Haptics.NotificationFeedbackType.Error,
    }[type];
    Haptics.notificationAsync(feedbackType);
  }
}

export function hapticSelection() {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    Haptics.selectionAsync();
  }
}
