import { jobFormStyles } from "./job-form.styles.ts";
import { type JobFormProps, useJobFormPresentation } from "./job-form.ts";
import { JobFormActions } from "./job-form-actions.tsx";
import { JobFormBasicFields } from "./job-form-basic-fields.tsx";
import { JobFormDetailsFields } from "./job-form-details-fields.tsx";

const styles = jobFormStyles();

export function JobForm({ submitting, onSubmit }: JobFormProps) {
  const { form } = useJobFormPresentation({ submitting, onSubmit });

  return (
    <form
      className={styles.root()}
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
          className={styles.error()}
        >
          {form.error}
        </p>
      )}
      <JobFormActions submitting={submitting} />
    </form>
  );
}
