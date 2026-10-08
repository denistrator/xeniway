import { JobForm } from "./job-form.view";
import type { JobFormContentProps } from "./job-form-content.model";
import { JobFormHeader } from "./job-form-header.view";

export function JobFormContent({
  presentation,
  submitting,
  onSave,
  onClose,
  onSwitchPresentation,
}: JobFormContentProps) {
  return (
    <>
      <JobFormHeader presentation={presentation} onClose={onClose} onSwitchPresentation={onSwitchPresentation} />
      <JobForm submitting={submitting} onSubmit={onSave} />
    </>
  );
}

export type { JobFormContentProps, JobFormDialogProps } from "./job-form-content.model";
