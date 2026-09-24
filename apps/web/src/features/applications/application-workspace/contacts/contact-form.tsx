import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../../components/ui/input";
import { WorkspaceFieldError, WorkspaceFormActions } from "../shared/workspace-section-ui";
import type { ContactsController } from "./use-contacts-controller";

export function ContactForm({ controller }: { controller: ContactsController }) {
  const { t } = useTranslation();
  const formId = useId();
  const { editor } = controller;
  if (!editor.target) return null;

  return (
    <form
      ref={editor.formRef}
      noValidate
      onSubmit={(event) => void editor.submit(event)}
      className="mt-4 space-y-4 rounded-xl border border-line bg-surface-tint p-4"
    >
      <h3 className="font-display text-lg text-ink">
        {t(editor.target === "new" ? "applications.workspace.contacts.add" : "applications.workspace.contacts.edit")}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["name", "role", "email", "phone", "profileUrl"] as const).map((field) => (
          <div key={field} className={field === "profileUrl" ? "sm:col-span-2" : undefined}>
            <label htmlFor={`${formId}-${field}`} className="mb-1 block text-sm font-medium text-ink">
              {t(`applications.workspace.contacts.${field}`)}
            </label>
            <Input
              id={`${formId}-${field}`}
              ref={field === "name" ? editor.firstFieldRef : undefined}
              name={field}
              type={field === "email" ? "email" : field === "profileUrl" ? "url" : field === "phone" ? "tel" : "text"}
              autoComplete={field === "name" ? "name" : field === "email" ? "email" : field === "phone" ? "tel" : "off"}
              required={field === "name" || field === "role"}
              maxLength={field === "profileUrl" ? 500 : field === "phone" ? 100 : 255}
              value={editor.draft[field]}
              className={editor.errors[field] ? "border-rose-600 focus:border-rose-600 focus:ring-rose-200" : undefined}
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
        <label htmlFor={`${formId}-notes`} className="mb-1 block text-sm font-medium text-ink">
          {t("applications.workspace.contacts.notes")}
        </label>
        <textarea
          id={`${formId}-notes`}
          name="notes"
          rows={3}
          maxLength={10000}
          value={editor.draft.notes}
          aria-invalid={Boolean(editor.errors.notes) || undefined}
          aria-describedby={editor.errors.notes ? `${formId}-notes-error` : undefined}
          onChange={(event) => editor.setField("notes", event.target.value)}
          className={`w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 ${
            editor.errors.notes
              ? "border-rose-600 focus:border-rose-600 focus:ring-rose-200"
              : "border-line focus:border-accent focus:ring-accent-soft"
          }`}
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
