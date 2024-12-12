import { StyleSheet, View } from "react-native";
import { Avatar, Surface, Text } from "react-native-paper";

const styles = StyleSheet.create({
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
  },
  headerText: {
    marginLeft: 12,
  },
});

export function ChatHeader() {
  return (
    <Surface style={styles.header}>
      <Avatar.Icon size={40} icon="doctor" />
      <View style={styles.headerText}>
        <Text variant="titleMedium">Sample Practice</Text>
        <Text variant="bodySmall">Online</Text>
      </View>
    </Surface>
  );
}
