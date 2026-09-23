import { useTranslation } from "react-i18next";
import { Input } from "../../../../components/ui/input";
import { WorkspaceFieldError } from "../shared/workspace-field-error";
import type { useFollowUpForm } from "./use-follow-up-form";

export function FollowUpFormFields({ id, form }: { id: string; form: ReturnType<typeof useFollowUpForm> }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div>
          <label htmlFor={`${id}-title`} className="mb-1 block text-sm font-medium text-ink">
            {t("applications.workspace.followUps.task")}
          </label>
          <Input
            id={`${id}-title`}
            ref={form.titleRef}
            name="title"
            required
            maxLength={255}
            value={form.title}
            className={form.errors.title ? "border-rose-600 focus:border-rose-600 focus:ring-rose-200" : undefined}
            aria-invalid={Boolean(form.errors.title) || undefined}
            aria-describedby={form.errors.title ? `${id}-title-error` : undefined}
            onChange={(event) => form.setTitle(event.target.value)}
          />
          <WorkspaceFieldError
            id={`${id}-title-error`}
            message={form.errors.title ? t(`applications.workspace.validation.${form.errors.title}`) : undefined}
          />
        </div>
        <div>
          <label htmlFor={`${id}-dueDate`} className="mb-1 block text-sm font-medium text-ink">
            {t("applications.workspace.followUps.dueDate")}
          </label>
          <Input
            id={`${id}-dueDate`}
            ref={form.dateRef}
            name="dueDate"
            type="date"
            required
            value={form.dueDate}
            className={form.errors.dueDate ? "border-rose-600 focus:border-rose-600 focus:ring-rose-200" : undefined}
            aria-invalid={Boolean(form.errors.dueDate) || undefined}
            aria-describedby={form.errors.dueDate ? `${id}-dueDate-error` : undefined}
            onChange={(event) => form.setDueDate(event.target.value)}
          />
          <WorkspaceFieldError
            id={`${id}-dueDate-error`}
            message={form.errors.dueDate ? t(`applications.workspace.validation.${form.errors.dueDate}`) : undefined}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-notes`} className="mb-1 block text-sm font-medium text-ink">
          {t("applications.workspace.followUps.notes")}
        </label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={3}
          maxLength={10000}
          value={form.notes}
          onChange={(event) => form.setNotes(event.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>
    </>
  );
}
