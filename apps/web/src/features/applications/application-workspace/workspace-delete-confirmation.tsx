import { ConfirmationModal } from "../../../components/ui/confirmation-modal";

export function WorkspaceDeleteConfirmation({
  title,
  text,
  pending,
  yesLabel,
  noLabel,
  onYes,
  onNo,
}: {
  title: string;
  text: string;
  pending: boolean;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <ConfirmationModal
      title={title}
      text={text}
      yesLabel={yesLabel}
      noLabel={noLabel}
      onYes={onYes}
      onNo={onNo}
      yesDisabled={pending}
    />
  );
}
