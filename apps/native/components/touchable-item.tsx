import { cn } from "heroui-native";
import { type PropsWithChildren } from "react";
import { Pressable, type PressableProps, StyleSheet, View } from "react-native";

const MIN_TOUCH_TARGET = 44;

interface TouchableItemProps extends Omit<PressableProps, "style"> {
  className?: string;
  children: React.ReactNode;
  minTouchTarget?: boolean;
}

export function TouchableItem({
  children,
  className,
  minTouchTarget = true,
  ...props
}: PropsWithChildren<TouchableItemProps>) {
  return (
    <Pressable
      className={cn("active:opacity-70", className)}
      style={[minTouchTarget && styles.minTouchTarget]}
      android_ripple={{ color: "rgba(0,0,0,0.1)" }}
      {...props}
    >
      {({ pressed: _pressed }) => (
        <View style={minTouchTarget ? styles.wrapper : undefined}>{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  minTouchTarget: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
  },
  wrapper: {
    flex: 1,
  },
});
