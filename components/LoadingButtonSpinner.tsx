import { useColorScheme } from "nativewind";

import { ButtonSpinner } from "@/components/ui/button";

interface LoadingButtonSpinnerProps {
  /**
   * Optional override for spinner color. If not provided, will use white for light mode and black for dark mode
   */
  color?: string;
}

export function LoadingButtonSpinner({ color }: LoadingButtonSpinnerProps) {
  const { colorScheme } = useColorScheme();
  const spinnerColor = color ?? (colorScheme === "dark" ? "black" : "white");

  return <ButtonSpinner color={spinnerColor} />;
}
