import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { PreparationEditor } from "./preparation-editor";
import { type PreparationKey, usePreparationField } from "./use-preparation-field";

export function PreparationField({
  applicationId,
  field,
  value,
}: {
  applicationId: number;
  field: PreparationKey;
  value: string | null;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const form = usePreparationField(applicationId, field, value);
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const label = t(`applications.workspace.preparation.${field}`);

  useEffect(() => {
    if (form.editing) wasEditing.current = true;
    else if (wasEditing.current) {
      editButton.current?.focus();
      wasEditing.current = false;
    }
  }, [form.editing]);

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg text-ink">{label}</h3>
        <Button
          ref={editButton}
          type="button"
          variant="outline"
          size="sm"
          disabled={form.editing}
          onClick={form.beginEdit}
          aria-label={t("applications.workspace.preparation.editNamed", { name: label.toLowerCase() })}
        >
          {t("applications.workspace.actions.edit")}
        </Button>
      </div>
      {form.editing ? (
        <PreparationEditor id={inputId} field={field} label={label} form={form} />
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
          {form.savedValue || t("applications.workspace.preparation.empty")}
        </p>
      )}
      <p
        role={form.state === "error" || form.state === "invalid" ? "alert" : undefined}
        aria-live="polite"
        className={`mt-2 text-sm ${form.state === "error" || form.state === "invalid" ? "text-rose-600" : "text-muted"}`}
      >
        {form.pending
          ? t("applications.workspace.actions.saving")
          : form.state === "saved"
            ? t("applications.workspace.preparation.savedNamed", { name: label })
            : form.state === "error"
              ? t("applications.workspace.preparation.saveFailedNamed", { name: label.toLowerCase() })
              : form.state === "invalid"
                ? t("applications.workspace.validation.notesTooLong")
                : null}
      </p>
    </div>
  );
}
