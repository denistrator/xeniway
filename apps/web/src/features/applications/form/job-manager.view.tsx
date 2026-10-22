import { ConfirmationModal } from "../../../components/ui/confirmation-modal.view";
import { JobDrawer } from "./job-drawer.view";
import { type JobManagerProps, useJobManagerPresentation } from "./job-manager.model";
import { JobModal } from "./job-modal.view";

export function JobManager({ open, submitting, submitError, onSave, onClose, openerRef }: JobManagerProps) {
  const { presentation, props, closeWarning } = useJobManagerPresentation({
    open,
    submitting,
    submitError,
    onSave,
    onClose,
    openerRef,
  });
  if (!open) {
    return null;
  }
  const dialog = presentation === "modal" ? <JobModal {...props} /> : <JobDrawer {...props} />;
  return (
    <>
      {dialog}
      {closeWarning.open && (
        <ConfirmationModal
          title={closeWarning.title}
          text={closeWarning.text}
          yesLabel={closeWarning.saveLabel}
          noLabel={closeWarning.discardLabel}
          pending={closeWarning.pending}
          onYes={closeWarning.saveAndClose}
          onNo={closeWarning.discardAndClose}
          dismissAction={{ label: closeWarning.keepEditingLabel, onDismiss: closeWarning.keepEditing }}
        />
      )}
    </>
  );
}
