import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

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
    <Animated.View className="flex-row gap-1 p-2 justify-center">
      {dots.map((index) => (
        <Animated.View
          key={index}
          style={animatedStyles[index]}
          className="w-2 h-2 rounded-full bg-gray-500 opacity-50"
        />
      ))}
    </Animated.View>
  );
}
