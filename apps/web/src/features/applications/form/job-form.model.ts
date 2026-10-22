import { useEffect } from "react";
import type { JobFormController } from "./use-job-form";

export type JobFormProps = {
  submitting: boolean;
  submitError?: string;
  form: JobFormController;
};

export function useJobFormPresentation({ form, submitError }: JobFormProps) {
  const error = form.error ?? submitError;
  useEffect(() => {
    if (error) {
      form.errorRef.current?.focus();
    }
  }, [error, form.errorRef]);
  return { form, error };
}
