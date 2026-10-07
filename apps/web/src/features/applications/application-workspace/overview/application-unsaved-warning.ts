import { useTranslation } from "react-i18next";

import { useCanMutate } from "../../../offline/offline-access.tsx";
import { getApplicationFieldLabel } from "./application-field-feedback.ts";
import type { ApplicationFieldsController } from "./use-application-fields.ts";

export type ApplicationUnsavedWarningProps = { fields: ApplicationFieldsController };
export function useApplicationUnsavedWarning({ fields }: ApplicationUnsavedWarningProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const warningField = fields.compact.warningField;
  const warningText = warningField
    ? t("applications.workspace.unsavedChangesText", { name: getApplicationFieldLabel(warningField, t) })
    : "";
  function saveWarning() {
    if (canMutate) {
      void fields.saveWarning();
    }
  }
  const confirmationTitle = t("applications.workspace.unsavedChangesTitle");
  const saveLabel = t("applications.workspace.actions.save");
  const cancelLabel = t("applications.workspace.actions.cancel");
  return {
    warningField,
    confirmationTitle,
    warningText,
    saveLabel,
    cancelLabel,
    canMutate,
    fields,
    saveWarning,
  };
}
