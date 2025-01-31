import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/Modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface MessageDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  isDeleting: boolean;
}

export function MessageDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isDeleting,
}: MessageDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Delete Messages</ModalHeader>
      <ModalBody>
        <Text>
          Are you sure you want to delete {selectedCount} message
          {selectedCount > 1 ? "s" : ""}?
        </Text>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" action="secondary" onPress={onClose} className="mr-2">
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button variant="solid" action="negative" onPress={onConfirm} disabled={isDeleting}>
          <ButtonText>{isDeleting ? "Deleting..." : "Delete"}</ButtonText>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
