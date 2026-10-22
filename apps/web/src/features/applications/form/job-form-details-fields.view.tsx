import { CalendarDays, CircleDot, FileText, StickyNote } from "lucide-react";
import { FloatingLabel } from "../../../components/ui/floating-label.view";
import { Input } from "../../../components/ui/input.view";
import { type JobFormDetailsFieldsProps, useJobFormDetailsFieldsPresentation } from "./job-form-details-fields.model";
import { jobFormDetailsFieldsStyles } from "./job-form-details-fields.styles";

const styles = jobFormDetailsFieldsStyles();

export function JobFormDetailsFields({ form, errors, update }: JobFormDetailsFieldsProps) {
  const {
    statusLabel,
    changeStatus,
    statusOptions,
    appliedDateLabel,
    changeAppliedDate,
    descriptionLabel,
    changeDescription,
    notesLabel,
    changeNotes,
    errors: fieldErrors,
  } = useJobFormDetailsFieldsPresentation({ form, errors, update });

  return (
    <>
      <div className={styles.statusDate()}>
        <FloatingLabel htmlFor="job-status" label={statusLabel} icon={CircleDot}>
          <select
            id="job-status"
            className={styles.statusInput()}
            name="status"
            value={form.status}
            aria-invalid={fieldErrors.status.error ? true : undefined}
            aria-describedby={fieldErrors.status.errorId}
            onChange={changeStatus}
          >
            {statusOptions.map((option) => (
              <option className={styles.statusOption()} key={option.status} value={option.status}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.status.error && (
            <p id={fieldErrors.status.errorId} role="alert" className={styles.fieldError()}>
              {fieldErrors.status.error}
            </p>
          )}
        </FloatingLabel>
        <FloatingLabel htmlFor="job-applied-at" label={appliedDateLabel} icon={CalendarDays}>
          <Input
            id="job-applied-at"
            className={styles.appliedDateInput()}
            name="appliedAt"
            placeholder=" "
            type="date"
            value={form.appliedAt}
            aria-invalid={fieldErrors.appliedAt.error ? true : undefined}
            aria-describedby={fieldErrors.appliedAt.errorId}
            onChange={changeAppliedDate}
          />
          {fieldErrors.appliedAt.error && (
            <p id={fieldErrors.appliedAt.errorId} role="alert" className={styles.fieldError()}>
              {fieldErrors.appliedAt.error}
            </p>
          )}
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="job-description" label={descriptionLabel} icon={FileText}>
        <textarea
          id="job-description"
          className={styles.descriptionInput()}
          name="description"
          placeholder=" "
          value={form.description}
          aria-invalid={fieldErrors.description.error ? true : undefined}
          aria-describedby={fieldErrors.description.errorId}
          onChange={changeDescription}
        />
        {fieldErrors.description.error && (
          <p id={fieldErrors.description.errorId} role="alert" className={styles.fieldError()}>
            {fieldErrors.description.error}
          </p>
        )}
      </FloatingLabel>
      <FloatingLabel htmlFor="job-notes" label={notesLabel} icon={StickyNote}>
        <textarea
          id="job-notes"
          className={styles.notesInput()}
          name="notes"
          placeholder=" "
          value={form.notes}
          aria-invalid={fieldErrors.notes.error ? true : undefined}
          aria-describedby={fieldErrors.notes.errorId}
          onChange={changeNotes}
        />
        {fieldErrors.notes.error && (
          <p id={fieldErrors.notes.errorId} role="alert" className={styles.fieldError()}>
            {fieldErrors.notes.error}
          </p>
        )}
      </FloatingLabel>
    </>
  );
}
