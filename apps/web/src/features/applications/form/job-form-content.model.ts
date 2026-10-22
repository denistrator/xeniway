import type { CreateApplicationInput } from "@xeniway/shared";
import type { RefObject } from "react";
import type { JobFormPresentation } from "../../../store";
import type { JobFormController } from "./use-job-form";

export type JobFormContentProps = {
  presentation: JobFormPresentation;
  submitting: boolean;
  form: JobFormController;
  onClose: () => void;
  onSwitchPresentation: () => void;
};
export type JobFormDialogProps = JobFormContentProps & {
  onSave: (input: CreateApplicationInput) => void;
  dialogRef: RefObject<HTMLElement | null>;
};
