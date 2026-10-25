import { Button } from "../../../components/ui/button.view";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal.view";
import { InfoMessage } from "../../../components/ui/info-message.view";
import { type ApplicationBulkDeleteProps, useApplicationBulkDelete } from "./application-bulk-delete.model";
import { applicationBulkDeleteStyles } from "./application-bulk-delete.styles";

const styles = applicationBulkDeleteStyles();

export function ApplicationBulkDelete(props: ApplicationBulkDeleteProps) {
  const view = useApplicationBulkDelete(props);
  return (
    <section ref={view.regionRef} aria-labelledby={view.headingId} tabIndex={-1} className={styles.root()}>
      <details className={styles.disclosure()}>
        <summary id={view.headingId} className={styles.summary()}>
          {view.actionsLabel}
        </summary>
        <p className={styles.scope()}>{view.scopeText}</p>
        <Button
          ref={view.triggerRef}
          variant="outline"
          className={styles.deleteButton()}
          disabled={view.disabled}
          onClick={view.open}
        >
          {view.deleteLabel}
        </Button>
      </details>
      {view.successMessage && (
        <InfoMessage messageId="bulk-deleted" returnFocusRef={view.regionRef} className={styles.success()}>
          {view.successMessage}
        </InfoMessage>
      )}
      {view.stage === "scope" && (
        <ConfirmationModal
          title={view.deleteLabel}
          text={view.scopeText}
          yesLabel={view.continueLabel}
          noLabel={view.cancelLabel}
          yesDisabled={view.disabled}
          returnFocusRef={view.returnFocusRef}
          onYes={view.continueToConfirmation}
          onNo={view.close}
        />
      )}
      {view.stage === "confirm" && (
        <ConfirmationModal
          title={view.dangerTitle}
          text={view.scopeText}
          yesLabel={view.confirmLabel}
          noLabel={view.cancelLabel}
          yesDisabled={view.confirmDisabled}
          pending={view.pending}
          error={view.error}
          returnFocusRef={view.returnFocusRef}
          onYes={view.confirm}
          onNo={view.close}
        />
      )}
    </section>
  );
}
