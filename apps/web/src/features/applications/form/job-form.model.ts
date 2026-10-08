import type { CreateApplicationInput } from "@xeniway/shared";
import { useJobForm } from "./use-job-form";

export type JobFormProps = {
  submitting: boolean;
  onSubmit: (input: CreateApplicationInput) => void;
};

export function useJobFormPresentation({ onSubmit }: JobFormProps) {
  const form = useJobForm({ onSubmit });

  return { form };
}
