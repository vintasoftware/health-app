import { useState } from "react";
import { Appbar, Menu } from "react-native-paper";

interface ThreadHeaderProps {
  onLogout?: () => void;
}

export function ThreadHeader({ onLogout }: ThreadHeaderProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  return (
    <Appbar.Header>
      <Appbar.Content title="Chat threads" />
      <Menu
        visible={isMenuVisible}
        onDismiss={() => setIsMenuVisible(false)}
        anchor={<Appbar.Action icon="dots-vertical" onPress={() => setIsMenuVisible(true)} />}
      >
        <Menu.Item
          onPress={() => {
            setIsMenuVisible(false);
            onLogout?.();
          }}
          title="Logout"
          leadingIcon="logout"
        />
      </Menu>
    </Appbar.Header>
  );
}
