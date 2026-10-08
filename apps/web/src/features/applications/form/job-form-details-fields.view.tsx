import { CalendarDays, CircleDot, FileText, StickyNote } from "lucide-react";
import { FloatingLabel } from "../../../components/ui/floating-label.view";
import { Input } from "../../../components/ui/input.view";
import { type JobFormDetailsFieldsProps, useJobFormDetailsFieldsPresentation } from "./job-form-details-fields.model";
import { jobFormDetailsFieldsStyles } from "./job-form-details-fields.styles";

const styles = jobFormDetailsFieldsStyles();

export function JobFormDetailsFields({ form, update }: JobFormDetailsFieldsProps) {
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
  } = useJobFormDetailsFieldsPresentation({ form, update });

  return (
    <>
      <div className={styles.statusDate()}>
        <FloatingLabel htmlFor="job-status" label={statusLabel} icon={CircleDot}>
          <select
            id="job-status"
            className={styles.statusInput()}
            name="status"
            value={form.status}
            onChange={changeStatus}
          >
            {statusOptions.map((option) => (
              <option className={styles.statusOption()} key={option.status} value={option.status}>
                {option.label}
              </option>
            ))}
          </select>
        </FloatingLabel>
        <FloatingLabel htmlFor="job-applied-at" label={appliedDateLabel} icon={CalendarDays}>
          <Input
            id="job-applied-at"
            className={styles.appliedDateInput()}
            name="appliedAt"
            placeholder=" "
            type="date"
            value={form.appliedAt}
            onChange={changeAppliedDate}
          />
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="job-description" label={descriptionLabel} icon={FileText}>
        <textarea
          id="job-description"
          className={styles.descriptionInput()}
          name="description"
          placeholder=" "
          value={form.description}
          onChange={changeDescription}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="job-notes" label={notesLabel} icon={StickyNote}>
        <textarea
          id="job-notes"
          className={styles.notesInput()}
          name="notes"
          placeholder=" "
          value={form.notes}
          onChange={changeNotes}
        />
      </FloatingLabel>
    </>
  );
}
