import { ConfirmationModal } from "../../../../components/ui/confirmation-modal.tsx";

import { type ApplicationUnsavedWarningProps, useApplicationUnsavedWarning } from "./application-unsaved-warning.ts";

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
