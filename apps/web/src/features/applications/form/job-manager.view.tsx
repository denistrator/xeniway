import { JobDrawer } from "./job-drawer.view";
import { type JobManagerProps, useJobManagerPresentation } from "./job-manager.model";
import { JobModal } from "./job-modal.view";

export function JobManager({ open, submitting, submitError, onSave, onClose, openerRef }: JobManagerProps) {
  const { presentation, props } = useJobManagerPresentation({
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
  return presentation === "modal" ? <JobModal {...props} /> : <JobDrawer {...props} />;
}
