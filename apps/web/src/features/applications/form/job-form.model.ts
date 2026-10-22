import type { JobFormController } from "./use-job-form";

export type JobFormProps = {
  submitting: boolean;
  form: JobFormController;
};

export function useJobFormPresentation({ form }: JobFormProps) {
  return { form };
}
