import { View } from "react-native";

import { Spinner } from "@/components/ui/spinner";

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background-50">
      <Spinner size="large" />
    </View>
  );
}
