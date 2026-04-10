import { Ionicons } from "@expo/vector-icons";
import { Surface, View } from "heroui-native";
import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

import { hapticImpact } from "@/utils/haptics";

interface SwipeAction {
  icon: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onLongPress?: () => void;
}

const ACTION_WIDTH = 80;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function SwipeableRow({
  children,
  leftActions,
  rightActions,
  onLongPress,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const isActive = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    hapticImpact("medium");
  }, []);

  const handleLeftAction = useCallback((action: SwipeAction) => {
    hapticImpact("light");
    action.onPress();
  }, []);

  const handleRightAction = useCallback((action: SwipeAction) => {
    hapticImpact("light");
    action.onPress();
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      isActive.value = true;
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      const maxLeft = leftActions ? leftActions.length * ACTION_WIDTH : 0;
      const maxRight = rightActions ? rightActions.length * ACTION_WIDTH : 0;
      translateX.value = Math.max(-maxRight, Math.min(maxLeft, event.translationX));
    })
    .onEnd((event) => {
      isActive.value = false;
      const maxLeft = leftActions ? leftActions.length * ACTION_WIDTH : 0;
      const maxRight = rightActions ? rightActions.length * ACTION_WIDTH : 0;

      if (event.translationX > maxLeft / 2 && leftActions) {
        translateX.value = withSpring(maxLeft, SPRING_CONFIG);
      } else if (event.translationX < -maxRight / 2 && rightActions) {
        translateX.value = withSpring(-maxRight, SPRING_CONFIG);
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (onLongPress) {
        runOnJS(onLongPress)();
      }
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionsStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? 1 : 0,
    transform: [{ translateX: -translateX.value }],
  }));

  const rightActionsStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? 1 : 0,
    transform: [{ translateX: -translateX.value }],
  }));

  return (
    <View style={styles.container}>
      {leftActions && leftActions.length > 0 && (
        <Animated.View style={[styles.actionsContainer, styles.leftActions, leftActionsStyle]}>
          {leftActions.map((action, index) => (
            <Surface
              key={index}
              variant="secondary"
              style={[styles.actionButton, { backgroundColor: action.color }]}
              className="items-center justify-center"
              onPress={() => handleLeftAction(action)}
            >
              <Ionicons name={action.icon as any} size={24} color="white" />
            </Surface>
          ))}
        </Animated.View>
      )}

      {rightActions && rightActions.length > 0 && (
        <Animated.View style={[styles.actionsContainer, styles.rightActions, rightActionsStyle]}>
          {rightActions.map((action, index) => (
            <Surface
              key={index}
              variant="secondary"
              style={[styles.actionButton, { backgroundColor: action.color }]}
              className="items-center justify-center"
              onPress={() => handleRightAction(action)}
            >
              <Ionicons name={action.icon as any} size={24} color="white" />
            </Surface>
          ))}
        </Animated.View>
      )}

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  content: {
    backgroundColor: "transparent",
  },
  actionsContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
  },
  leftActions: {
    left: 0,
  },
  rightActions: {
    right: 0,
  },
  actionButton: {
    width: ACTION_WIDTH,
    height: "100%",
    borderRadius: 12,
    marginHorizontal: 4,
  },
});
