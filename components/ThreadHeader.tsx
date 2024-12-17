import { Appbar } from "react-native-paper";

interface ThreadHeaderProps {
  onSearchPress?: () => void;
  onMenuPress?: () => void;
}

export function ThreadHeader({ onSearchPress, onMenuPress }: ThreadHeaderProps) {
  return (
    <Appbar.Header>
      <Appbar.Content title="Chat threads" />
      <Appbar.Action icon="magnify" onPress={onSearchPress ?? (() => {})} />
      <Appbar.Action icon="dots-vertical" onPress={onMenuPress ?? (() => {})} />
    </Appbar.Header>
  );
}
