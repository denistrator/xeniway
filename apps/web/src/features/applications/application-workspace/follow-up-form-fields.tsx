import { useTranslation } from "react-i18next";
import { Input } from "../../../components/ui/input";
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
            onChange={(event) => form.setTitle(event.target.value)}
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
            onChange={(event) => form.setDueDate(event.target.value)}
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
