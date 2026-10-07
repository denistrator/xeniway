import { JobDrawer } from "./job-drawer.tsx";
import { type JobManagerProps, useJobManagerPresentation } from "./job-manager.ts";
import { JobModal } from "./job-modal.tsx";

export function JobManager({ open, submitting, onSave, onClose, openerRef }: JobManagerProps) {
  const { presentation, props } = useJobManagerPresentation({ open, submitting, onSave, onClose, openerRef });
  if (!open) {
    return null;
  }
  return presentation === "modal" ? <JobModal {...props} /> : <JobDrawer {...props} />;
}
