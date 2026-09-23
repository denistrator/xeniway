import { useTranslation } from "react-i18next";
import { Input } from "../../../../components/ui/input";
import { WorkspaceFieldError } from "../shared/workspace-field-error";
import type { useContactForm } from "./use-contact-form";

export function ContactFormFields({ id, form }: { id: string; form: ReturnType<typeof useContactForm> }) {
  const { t } = useTranslation();
  const fields = ["name", "role", "email", "phone", "profileUrl"] as const;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field} className={field === "profileUrl" ? "sm:col-span-2" : undefined}>
            <label htmlFor={`${id}-${field}`} className="mb-1 block text-sm font-medium text-ink">
              {t(`applications.workspace.contacts.${field}`)}
            </label>
            <Input
              id={`${id}-${field}`}
              ref={field === "name" ? form.firstField : undefined}
              name={field}
              type={field === "email" ? "email" : field === "profileUrl" ? "url" : field === "phone" ? "tel" : "text"}
              autoComplete={field === "name" ? "name" : field === "email" ? "email" : field === "phone" ? "tel" : "off"}
              required={field === "name" || field === "role"}
              maxLength={field === "profileUrl" ? 500 : field === "phone" ? 100 : 255}
              value={form.draft[field]}
              className={form.errors[field] ? "border-rose-600 focus:border-rose-600 focus:ring-rose-200" : undefined}
              aria-invalid={Boolean(form.errors[field]) || undefined}
              aria-describedby={form.errors[field] ? `${id}-${field}-error` : undefined}
              onChange={(event) => form.setField(field, event.target.value)}
            />
            <WorkspaceFieldError
              id={`${id}-${field}-error`}
              message={form.errors[field] ? t(`applications.workspace.validation.${form.errors[field]}`) : undefined}
            />
          </div>
        ))}
      </div>
      <div>
        <label htmlFor={`${id}-notes`} className="mb-1 block text-sm font-medium text-ink">
          {t("applications.workspace.contacts.notes")}
        </label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={3}
          maxLength={10000}
          value={form.draft.notes}
          aria-invalid={Boolean(form.errors.notes) || undefined}
          aria-describedby={form.errors.notes ? `${id}-notes-error` : undefined}
          onChange={(event) => form.setField("notes", event.target.value)}
          className={`w-full rounded-xl border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 ${form.errors.notes ? "border-rose-600 focus:border-rose-600 focus:ring-rose-200" : "border-line focus:border-accent focus:ring-accent-soft"}`}
        />
        <WorkspaceFieldError
          id={`${id}-notes-error`}
          message={form.errors.notes ? t(`applications.workspace.validation.${form.errors.notes}`) : undefined}
        />
      </div>
    </>
  );
}
