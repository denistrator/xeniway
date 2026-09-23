import type { ApplicationFollowUpTask, CreateApplicationFollowUpTaskInput } from "@xeniway/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { FollowUpFormFields } from "./follow-up-form-fields";
import { useFollowUpForm } from "./use-follow-up-form";

export function FollowUpForm({
  task,
  onSave,
  onCancel,
  pending,
}: {
  task?: ApplicationFollowUpTask;
  onSave: (input: CreateApplicationFollowUpTaskInput) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const form = useFollowUpForm(task, onSave);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.submit(event);
      }}
      className="mt-4 space-y-4 rounded-xl border border-line bg-surface-tint p-4"
    >
      <h3 className="font-display text-lg text-ink">
        {t(task ? "applications.workspace.followUps.edit" : "applications.workspace.followUps.add")}
      </h3>
      <FollowUpFormFields id={id} form={form} />
      {form.error && (
        <p role="alert" className="text-sm text-rose-600">
          {t(`applications.workspace.validation.${form.error}`)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t(pending ? "applications.workspace.actions.saving" : "applications.workspace.followUps.save")}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onCancel}>
          {t("applications.workspace.actions.cancel")}
        </Button>
      </div>
    </form>
  );
}
