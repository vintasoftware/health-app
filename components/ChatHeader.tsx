import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Appbar, Avatar, Text } from "react-native-paper";

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flexDirection: "column",
  },
});

export function ChatHeader() {
  const router = useRouter();

  return (
    <Appbar.Header>
      <Appbar.BackAction
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/");
          }
        }}
      />
      <Appbar.Content
        title={
          <View style={styles.headerContent}>
            <Avatar.Icon size={40} icon="doctor" />
            <View style={styles.headerText}>
              <Text variant="titleMedium">Sample Practice</Text>
              <Text variant="bodySmall">Online</Text>
            </View>
          </View>
        }
      />
    </Appbar.Header>
  );
}
