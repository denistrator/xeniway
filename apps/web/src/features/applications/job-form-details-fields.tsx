import { CalendarDays, CircleDot, FileText, StickyNote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FloatingLabel } from "../../components/ui/floating-label";
import { Input } from "../../components/ui/input";
import { getStatusLabel, jobStatuses } from "./job-status";
import type { FormState } from "./use-job-form";

export function JobFormDetailsFields({
  form,
  update,
}: {
  form: FormState;
  update: (field: keyof FormState, value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingLabel htmlFor="job-status" label={t("applications.form.status")} icon={CircleDot}>
          <select
            id="job-status"
            className="peer"
            name="status"
            value={form.status}
            onChange={(event) => update("status", event.target.value)}
          >
            {jobStatuses.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(t, status)}
              </option>
            ))}
          </select>
        </FloatingLabel>
        <FloatingLabel htmlFor="job-applied-at" label={t("applications.form.appliedDate")} icon={CalendarDays}>
          <Input
            id="job-applied-at"
            className="peer"
            name="appliedAt"
            placeholder=" "
            type="date"
            value={form.appliedAt}
            onChange={(event) => update("appliedAt", event.target.value)}
          />
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="job-description" label={t("applications.form.description")} icon={FileText}>
        <textarea
          id="job-description"
          className="peer min-h-24"
          name="description"
          placeholder=" "
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="job-notes" label={t("applications.form.notes")} icon={StickyNote}>
        <textarea
          id="job-notes"
          className="peer min-h-24"
          name="notes"
          placeholder=" "
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </FloatingLabel>
    </>
  );
}
