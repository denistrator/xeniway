import { useId } from "react";
import { useTranslation } from "react-i18next";
import { fieldErrorStyles, fieldLabelStyles, textAreaStyles } from "../../../../components/ui/field-styles";
import { Input } from "../../../../components/ui/input";
import { editorFormStyles } from "../../../../components/ui/surface-styles";
import { cn } from "../../../../lib/utils";
import { useCanMutate } from "../../../offline/offline-access";
import { WorkspaceFieldError, WorkspaceFormActions } from "../shared/workspace-section-ui";
import type { ContactsController } from "./use-contacts-controller";

export function ContactForm({ controller }: { controller: ContactsController }) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const formId = useId();
  const { editor } = controller;
  if (!editor.target) return null;

  return (
    <form
      ref={editor.formRef}
      noValidate
      onSubmit={(event) => {
        if (canMutate) void editor.submit(event);
        else event.preventDefault();
      }}
      className={editorFormStyles()}
    >
      <h3 className="font-display text-lg text-ink">
        {t(editor.target === "new" ? "applications.workspace.contacts.add" : "applications.workspace.contacts.edit")}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["name", "role", "email", "phone", "profileUrl"] as const).map((field) => (
          <div key={field} className={cn(field === "profileUrl" && "sm:col-span-2")}>
            <label htmlFor={`${formId}-${field}`} className={fieldLabelStyles()}>
              {t(`applications.workspace.contacts.${field}`)}
            </label>
            <Input
              id={`${formId}-${field}`}
              ref={field === "name" ? editor.firstFieldRef : undefined}
              name={field}
              readOnly={!canMutate}
              type={field === "email" ? "email" : field === "profileUrl" ? "url" : field === "phone" ? "tel" : "text"}
              autoComplete={field === "name" ? "name" : field === "email" ? "email" : field === "phone" ? "tel" : "off"}
              required={field === "name" || field === "role"}
              maxLength={field === "profileUrl" ? 500 : field === "phone" ? 100 : 255}
              value={editor.draft[field]}
              className={fieldErrorStyles({ invalid: Boolean(editor.errors[field]) })}
              aria-invalid={Boolean(editor.errors[field]) || undefined}
              aria-describedby={editor.errors[field] ? `${formId}-${field}-error` : undefined}
              onChange={(event) => editor.setField(field, event.target.value)}
            />
            {editor.errors[field] && (
              <WorkspaceFieldError
                id={`${formId}-${field}-error`}
                text={t(`applications.workspace.validation.${editor.errors[field]}`)}
              />
            )}
          </div>
        ))}
      </div>
      <div>
        <label htmlFor={`${formId}-notes`} className={fieldLabelStyles()}>
          {t("applications.workspace.contacts.notes")}
        </label>
        <textarea
          id={`${formId}-notes`}
          name="notes"
          readOnly={!canMutate}
          rows={3}
          maxLength={10000}
          value={editor.draft.notes}
          aria-invalid={Boolean(editor.errors.notes) || undefined}
          aria-describedby={editor.errors.notes ? `${formId}-notes-error` : undefined}
          onChange={(event) => editor.setField("notes", event.target.value)}
          className={textAreaStyles({ invalid: Boolean(editor.errors.notes) })}
        />
        {editor.errors.notes && (
          <WorkspaceFieldError
            id={`${formId}-notes-error`}
            text={t(`applications.workspace.validation.${editor.errors.notes}`)}
          />
        )}
      </div>
      <WorkspaceFormActions
        pending={controller.pending}
        saveLabel={t("applications.workspace.contacts.save")}
        savingLabel={t("applications.workspace.actions.saving")}
        cancelLabel={t("applications.workspace.actions.cancel")}
        onCancel={editor.close}
      />
    </form>
  );
}
