import { useTranslation } from "react-i18next";

import { getApplicationFieldFeedback } from "./application-field-feedback.ts";
import type { ApplicationFieldsController } from "./use-application-fields.ts";

export type ApplicationDetailsSectionProps = { fields: ApplicationFieldsController };
export function useApplicationDetailsSection({ fields }: ApplicationDetailsSectionProps) {
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
  const preparedDefinitions = definitions.map((definition) => {
    const controller = fields.fields[definition.field];
    return { ...definition, controller, feedback: getApplicationFieldFeedback(controller, definition.label, t) };
  });

  return { definitions: preparedDefinitions };
}
