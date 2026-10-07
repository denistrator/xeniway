import { useTranslation } from "react-i18next";
import { ConfirmationModal } from "../../../../components/ui/confirmation-modal";
import { useCanMutate } from "../../../offline/offline-access";
import { getApplicationFieldLabel } from "./application-field-feedback";
import type { ApplicationFieldsController } from "./use-application-fields";

export function ApplicationUnsavedWarning({ fields }: { fields: ApplicationFieldsController }) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const warningField = fields.compact.warningField;
  if (!warningField) {
    return null;
  }

  return (
    <ConfirmationModal
      title={t("applications.workspace.unsavedChangesTitle")}
      text={t("applications.workspace.unsavedChangesText", {
        name: getApplicationFieldLabel(warningField, t),
      })}
      yesLabel={t("applications.workspace.actions.save")}
      noLabel={t("applications.workspace.actions.cancel")}
      yesDisabled={!canMutate || fields.fields[warningField].pending}
      onYes={() => {
        if (canMutate) {
          void fields.saveWarning();
        }
      }}
      onNo={fields.cancelWarning}
    />
  );
}
