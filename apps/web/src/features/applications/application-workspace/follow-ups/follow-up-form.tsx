import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../../components/ui/input";
import { WorkspaceFieldError, WorkspaceFormActions } from "../shared/workspace-section-ui";
import type { FollowUpsController } from "./use-follow-ups-controller";

export function FollowUpForm({ controller }: { controller: FollowUpsController }) {
  const { t } = useTranslation();
  const formId = useId();
  const { editor } = controller;
  if (!editor.target) return null;

  return (
    <form
      noValidate
      onSubmit={(event) => void editor.submit(event)}
      className="mt-4 space-y-4 rounded-xl border border-line bg-surface-tint p-4"
    >
      <h3 className="font-display text-lg text-ink">
        {t(editor.target === "new" ? "applications.workspace.followUps.add" : "applications.workspace.followUps.edit")}
      </h3>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div>
          <label htmlFor={`${formId}-title`} className="mb-1 block text-sm font-medium text-ink">
            {t("applications.workspace.followUps.task")}
          </label>
          <Input
            id={`${formId}-title`}
            ref={editor.titleRef}
            name="title"
            required
            maxLength={255}
            value={editor.draft.title}
            className={editor.errors.title ? "border-rose-600 focus:border-rose-600 focus:ring-rose-200" : undefined}
            aria-invalid={Boolean(editor.errors.title) || undefined}
            aria-describedby={editor.errors.title ? `${formId}-title-error` : undefined}
            onChange={(event) => editor.setTitle(event.target.value)}
          />
          {editor.errors.title && (
            <WorkspaceFieldError
              id={`${formId}-title-error`}
              text={t(`applications.workspace.validation.${editor.errors.title}`)}
            />
          )}
        </div>
        <div>
          <label htmlFor={`${formId}-dueDate`} className="mb-1 block text-sm font-medium text-ink">
            {t("applications.workspace.followUps.dueDate")}
          </label>
          <Input
            id={`${formId}-dueDate`}
            ref={editor.dateRef}
            name="dueDate"
            type="date"
            required
            value={editor.draft.dueDate}
            className={editor.errors.dueDate ? "border-rose-600 focus:border-rose-600 focus:ring-rose-200" : undefined}
            aria-invalid={Boolean(editor.errors.dueDate) || undefined}
            aria-describedby={editor.errors.dueDate ? `${formId}-dueDate-error` : undefined}
            onChange={(event) => editor.setDueDate(event.target.value)}
          />
          {editor.errors.dueDate && (
            <WorkspaceFieldError
              id={`${formId}-dueDate-error`}
              text={t(`applications.workspace.validation.${editor.errors.dueDate}`)}
            />
          )}
        </div>
      </div>
      <div>
        <label htmlFor={`${formId}-notes`} className="mb-1 block text-sm font-medium text-ink">
          {t("applications.workspace.followUps.notes")}
        </label>
        <textarea
          id={`${formId}-notes`}
          name="notes"
          rows={3}
          maxLength={10000}
          value={editor.draft.notes}
          onChange={(event) => editor.setNotes(event.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>
      <WorkspaceFormActions
        pending={controller.pending}
        saveLabel={t("applications.workspace.followUps.save")}
        savingLabel={t("applications.workspace.actions.saving")}
        cancelLabel={t("applications.workspace.actions.cancel")}
        onCancel={editor.close}
      />
    </form>
  );
}
