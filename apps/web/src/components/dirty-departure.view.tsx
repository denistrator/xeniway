import { useDirtyDeparture } from "./dirty-departure.model";
import { ConfirmationModal } from "./ui/confirmation-modal.view";

export function DirtyDeparture() {
  const view = useDirtyDeparture();

  if (!view.isBlocked) {
    return null;
  }

  if (!view.canSave) {
    return (
      <ConfirmationModal
        title={view.title}
        text={view.text}
        yesLabel={view.discardLabel}
        noLabel={view.keepEditingLabel}
        pending={view.pending}
        onYes={view.discardAndProceed}
        onNo={view.keepEditing}
      />
    );
  }

  return (
    <ConfirmationModal
      title={view.title}
      text={view.text}
      yesLabel={view.saveLabel}
      noLabel={view.discardLabel}
      pending={view.pending}
      onYes={view.saveAndProceed}
      onNo={view.discardAndProceed}
      dismissAction={{ label: view.keepEditingLabel, onDismiss: view.keepEditing }}
    />
  );
}
