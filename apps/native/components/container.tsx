import { cn } from "heroui-native";
import { type PropsWithChildren } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";

const AnimatedView = Animated.createAnimatedComponent(View);

type Props = AnimatedProps<ViewProps> & {
  className?: string;
  isScrollable?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Container({
  children,
  className,
  isScrollable = true,
  scrollViewProps,
  onRefresh,
  refreshing = false,
  ...props
}: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  return (
    <AnimatedView
      className={cn("flex-1 bg-background", className)}
      style={{
        paddingBottom: insets.bottom,
      }}
      {...props}
    >
      {isScrollable ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={isRefreshing || refreshing}
                onRefresh={handleRefresh}
                tintColor="#007AFF"
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1">{children}</View>
      )}
    </AnimatedView>
  );
}
