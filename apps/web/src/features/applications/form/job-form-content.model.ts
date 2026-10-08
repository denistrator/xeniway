import type { CreateApplicationInput } from "@xeniway/shared";
import type { RefObject } from "react";
import type { JobFormPresentation } from "../../../store";

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
