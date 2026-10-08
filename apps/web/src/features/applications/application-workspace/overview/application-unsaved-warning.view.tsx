import { ConfirmationModal } from "../../../../components/ui/confirmation-modal.view";

import { type ApplicationUnsavedWarningProps, useApplicationUnsavedWarning } from "./application-unsaved-warning.model";

export function ApplicationUnsavedWarning(props: ApplicationUnsavedWarningProps) {
  const view = useApplicationUnsavedWarning(props);

  if (!view.warningField) {
    return null;
  }
  return (
    <ConfirmationModal
      title={view.confirmationTitle}
      text={view.warningText}
      yesLabel={view.saveLabel}
      noLabel={view.cancelLabel}
      yesDisabled={!view.canMutate || view.fields.fields[view.warningField].pending}
      onYes={view.saveWarning}
      onNo={view.fields.cancelWarning}
    />
  );
}
