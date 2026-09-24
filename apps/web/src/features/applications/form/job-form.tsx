import type { CreateApplicationInput } from "@xeniway/shared";
import { JobFormActions } from "./job-form-actions";
import { JobFormBasicFields } from "./job-form-basic-fields";
import { JobFormDetailsFields } from "./job-form-details-fields";
import { useJobForm } from "./use-job-form";

export function JobForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (input: CreateApplicationInput) => void;
}) {
  const form = useJobForm({ onSubmit });

  return (
    <form
      className="flex grow flex-col space-y-4"
      onSubmit={form.handleSubmit}
      aria-describedby={form.error ? "application-form-error" : undefined}
      autoComplete="off"
    >
      <JobFormBasicFields form={form.form} update={form.update} />
      <JobFormDetailsFields form={form.form} update={form.update} />
      {form.error && (
        <p
          ref={form.errorRef}
          id="application-form-error"
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="text-sm text-rose-600 dark:text-rose-400"
        >
          {form.error}
        </p>
      )}
      <JobFormActions submitting={submitting} />
    </form>
  );
}
