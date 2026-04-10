import * as Haptics from "expo-haptics";

type HapticNotificationType = "success" | "warning" | "error" | "none";
type HapticImpactType = "light" | "medium" | "heavy";

export function hapticImpact(type: HapticImpactType = "medium") {
  const styles: Record<HapticImpactType, Haptics.ImpactFeedbackStyle> = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  };

  return Haptics.impactAsync(styles[type]);
}

export function hapticNotification(type: HapticNotificationType = "none") {
  const styles: Record<HapticNotificationType, Haptics.NotificationFeedbackType> = {
    success: Haptics.NotificationFeedbackType.Success,
    warning: Haptics.NotificationFeedbackType.Warning,
    error: Haptics.NotificationFeedbackType.Error,
    none: Haptics.NotificationFeedbackType.None,
  };

  return Haptics.notificationAsync(styles[type]);
}

export function hapticSelection() {
  return Haptics.selectionAsync();
}
