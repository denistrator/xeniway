import { JobForm } from "./job-form.view";
import type { JobFormContentProps } from "./job-form-content.model";
import { JobFormHeader } from "./job-form-header.view";

export function JobFormContent({
  presentation,
  submitting,
  submitError,
  form,
  onClose,
  onSwitchPresentation,
}: JobFormContentProps) {
  return (
    <>
      <JobFormHeader presentation={presentation} onClose={onClose} onSwitchPresentation={onSwitchPresentation} />
      <JobForm submitting={submitting} submitError={submitError} form={form} />
    </>
  );
}

export type { JobFormContentProps, JobFormDialogProps } from "./job-form-content.model";
