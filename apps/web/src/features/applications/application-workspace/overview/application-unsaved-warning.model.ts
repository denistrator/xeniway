import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { useCanMutate } from "../../../offline/offline-access.view";
import { getApplicationFieldLabel } from "./application-field-feedback";
import type { ApplicationFieldsController } from "./use-application-fields";

export type ApplicationUnsavedWarningProps = { fields: ApplicationFieldsController };
export function useApplicationUnsavedWarning({ fields }: ApplicationUnsavedWarningProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const warningField = fields.compact.warningField;
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const warningText = warningField
    ? t("applications.workspace.unsavedChangesText", { name: getApplicationFieldLabel(warningField, t) })
    : "";
  function saveWarning() {
    if (canMutate) {
      void fields.saveWarning();
    }
  }

  function keepEditing() {
    returnFocusRef.current = document.querySelector<HTMLElement>(`[data-compact-edit-field="${warningField}"] input`);
    fields.dismissWarning();
  }

  const confirmationTitle = t("applications.workspace.unsavedChangesTitle");
  const warningErrorKey = warningField ? fields.fields[warningField].errorKey : null;
  const warningError = warningErrorKey ? t(warningErrorKey) : undefined;
  const saveLabel = t("applications.workspace.actions.saveChanges");
  const discardLabel = t("applications.workspace.actions.discardChanges");
  const dismissAction = { label: t("applications.workspace.actions.keepEditing"), onDismiss: keepEditing };
  return {
    warningField,
    confirmationTitle,
    warningText,
    warningError,
    saveLabel,
    discardLabel,
    dismissAction,
    returnFocusRef,
    canMutate,
    fields,
    saveWarning,
  };
}
