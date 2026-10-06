import { useId } from "react";
import { useTranslation } from "react-i18next";
import { fieldErrorStyles, fieldLabelStyles, textAreaStyles } from "../../../../components/ui/field-styles";
import { Input } from "../../../../components/ui/input";
import { editorFormStyles } from "../../../../components/ui/surface-styles";
import { WorkspaceFieldError, WorkspaceFormActions } from "../shared/workspace-section-ui";
import type { FollowUpsController } from "./use-follow-ups-controller";

export function FollowUpForm({ controller }: { controller: FollowUpsController }) {
  const { t } = useTranslation();
  const formId = useId();
  const { editor } = controller;
  if (!editor.target) return null;

  return (
    <form noValidate onSubmit={(event) => void editor.submit(event)} className={editorFormStyles()}>
      <h3 className="font-display text-lg text-ink">
        {t(editor.target === "new" ? "applications.workspace.followUps.add" : "applications.workspace.followUps.edit")}
      </h3>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div>
          <label htmlFor={`${formId}-title`} className={fieldLabelStyles()}>
            {t("applications.workspace.followUps.task")}
          </label>
          <Input
            id={`${formId}-title`}
            ref={editor.titleRef}
            name="title"
            required
            maxLength={255}
            value={editor.draft.title}
            className={fieldErrorStyles({ invalid: Boolean(editor.errors.title) })}
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
          <label htmlFor={`${formId}-dueDate`} className={fieldLabelStyles()}>
            {t("applications.workspace.followUps.dueDate")}
          </label>
          <Input
            id={`${formId}-dueDate`}
            ref={editor.dateRef}
            name="dueDate"
            type="date"
            required
            value={editor.draft.dueDate}
            className={fieldErrorStyles({ invalid: Boolean(editor.errors.dueDate) })}
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
        <label htmlFor={`${formId}-notes`} className={fieldLabelStyles()}>
          {t("applications.workspace.followUps.notes")}
        </label>
        <textarea
          id={`${formId}-notes`}
          name="notes"
          rows={3}
          maxLength={10000}
          value={editor.draft.notes}
          onChange={(event) => editor.setNotes(event.target.value)}
          className={textAreaStyles()}
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
