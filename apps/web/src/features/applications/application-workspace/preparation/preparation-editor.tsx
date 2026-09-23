import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import type { PreparationKey, usePreparationField } from "./use-preparation-field";

export function PreparationEditor({
  id,
  field,
  label,
  form,
}: {
  id: string;
  field: PreparationKey;
  label: string;
  form: ReturnType<typeof usePreparationField>;
}) {
  const { t } = useTranslation();
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => textarea.current?.focus(), []);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.save();
      }}
      className="mt-3 space-y-3"
    >
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        ref={textarea}
        name={field}
        value={form.draft}
        onChange={(event) => form.setDraft(event.target.value)}
        maxLength={10000}
        rows={5}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={form.pending}
          aria-label={t("applications.workspace.preparation.saveNamed", { name: label.toLowerCase() })}
        >
          {t("applications.workspace.actions.save")}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={form.pending} onClick={form.cancel}>
          {t("applications.workspace.actions.cancel")}
        </Button>
      </div>
    </form>
  );
}
