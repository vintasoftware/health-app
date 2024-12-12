import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: "row",
    gap: 4,
    padding: 8,
    justifyContent: "center",
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "gray",
    opacity: 0.5,
  },
});

export function LoadingDots() {
  const dots = [0, 1, 2];
  const opacities = [useSharedValue(0.5), useSharedValue(0.5), useSharedValue(0.5)];
  const animatedStyles = [
    useAnimatedStyle(() => ({ opacity: opacities[0].value })),
    useAnimatedStyle(() => ({ opacity: opacities[1].value })),
    useAnimatedStyle(() => ({ opacity: opacities[2].value })),
  ];

  useEffect(() => {
    dots.forEach((index) => {
      opacities[index].value = withRepeat(
        withSequence(
          withDelay(index * 200, withTiming(1, { duration: 400 })),
          withTiming(0.5, { duration: 400 }),
        ),
        -1,
        true,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={styles.loadingContainer}>
      {dots.map((index) => (
        <Animated.View key={index} style={[styles.loadingDot, animatedStyles[index]]} />
      ))}
    </Animated.View>
  );
}
