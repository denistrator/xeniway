import type { CreateApplicationInput } from "@xeniway/shared";
import type { RefObject } from "react";
import type { JobFormPresentation } from "../../../store";
import { JobForm } from "./job-form";
import { JobFormHeader } from "./job-form-header";

export type JobFormContentProps = {
  presentation: JobFormPresentation;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onClose: () => void;
  onSwitchPresentation: () => void;
};

export type JobFormDialogProps = JobFormContentProps & {
  dialogRef: RefObject<HTMLElement | null>;
};

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
