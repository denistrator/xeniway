import { type JobFormProps, useJobFormPresentation } from "./job-form.model";
import { jobFormStyles } from "./job-form.styles";
import { JobFormActions } from "./job-form-actions.view";
import { JobFormBasicFields } from "./job-form-basic-fields.view";
import { JobFormDetailsFields } from "./job-form-details-fields.view";

const styles = jobFormStyles();

export function JobForm({ submitting, submitError, form: controller }: JobFormProps) {
  const { form, error } = useJobFormPresentation({ submitting, submitError, form: controller });

  return (
    <form
      className={styles.root()}
      onSubmit={form.handleSubmit}
      aria-describedby={error ? "application-form-error" : undefined}
      autoComplete="off"
    >
      <JobFormBasicFields form={form.form} update={form.update} />
      <JobFormDetailsFields form={form.form} update={form.update} />
      {error && (
        <p
          ref={form.errorRef}
          id="application-form-error"
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className={styles.error()}
        >
          {error}
        </p>
      )}
      <JobFormActions submitting={submitting} />
    </form>
  );
}
