import { useTranslation } from "react-i18next";
import { WorkspaceTextField } from "../shared/workspace-text-field";
import { getApplicationFieldFeedback } from "./application-field-feedback";
import type { ApplicationFieldsController } from "./use-application-fields";

export function ApplicationDetailsSection({ fields }: { fields: ApplicationFieldsController }) {
  const { t } = useTranslation();
  const definitions = [
    {
      field: "description" as const,
      id: "application-about",
      label: t("applications.workspace.about"),
    },
    {
      field: "notes" as const,
      id: "application-notes",
      label: t("applications.workspace.applicationNotes"),
    },
  ];

  return definitions.map(({ field, id, label }) => {
    const controller = fields.fields[field];
    return (
      <WorkspaceTextField
        key={field}
        id={id}
        label={label}
        headingLevel={2}
        className="rounded-2xl border border-line bg-surface p-5"
        headingClassName="font-display text-lg font-semibold text-ink"
        controller={controller}
        feedback={getApplicationFieldFeedback(controller, label, t)}
      />
    );
  });
}
