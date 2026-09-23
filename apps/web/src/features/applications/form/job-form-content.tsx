import type { CreateApplicationInput, JobApplication } from "@xeniway/shared";
import type { RefObject } from "react";
import type { JobFormPresentation } from "../../../store";
import { ApplicationActivity } from "../activity/application-activity";
import { JobForm } from "./job-form";
import { JobFormHeader } from "./job-form-header";

export type JobFormContentProps = {
  presentation: JobFormPresentation;
  mode: "create" | "edit";
  job?: JobApplication;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onArchive: () => void;
  onBlacklist: (reason: string) => void;
  blacklisting: boolean;
  onClose: () => void;
  onSwitchPresentation: () => void;
};

export type JobFormDialogProps = JobFormContentProps & {
  dialogRef: RefObject<HTMLElement | null>;
};

export function JobFormContent({
  presentation,
  mode,
  job,
  submitting,
  onSave,
  onArchive,
  onBlacklist,
  blacklisting,
  onClose,
  onSwitchPresentation,
}: JobFormContentProps) {
  return (
    <>
      <JobFormHeader
        mode={mode}
        presentation={presentation}
        onClose={onClose}
        onSwitchPresentation={onSwitchPresentation}
      />
      <JobForm
        job={job}
        submitting={submitting}
        onSubmit={onSave}
        onArchive={mode === "edit" ? onArchive : undefined}
        onBlacklist={mode === "edit" ? onBlacklist : undefined}
        blacklisting={blacklisting}
      />
      {mode === "edit" && job && <ApplicationActivity applicationId={job.id} />}
    </>
  );
}
