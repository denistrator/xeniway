import { Button } from "../../../../components/ui/button.view";
import { ConfirmationModal } from "../../../../components/ui/confirmation-modal.view";
import {
  type ApplicationLifecycleActionsProps,
  useApplicationLifecycleActions,
} from "./application-lifecycle-actions.model";
import { applicationLifecycleActionsStyles } from "./application-lifecycle-actions.styles";

const styles = applicationLifecycleActionsStyles();
export function ApplicationLifecycleActions(props: ApplicationLifecycleActionsProps) {
  const view = useApplicationLifecycleActions(props);

  return (
    <>
      <nav ref={view.actionsRef} tabIndex={-1} aria-label={view.actionsLabel} className={styles.root()}>
        {view.lifecycle.board === "active" ? (
          <>
            <Button variant="outline" disabled={!view.canMutate} onClick={view.requestArchive}>
              {view.labels.archive}
            </Button>
            <Button variant="ghost" disabled={!view.canMutate} onClick={view.requestBlacklist}>
              {view.labels.blacklist}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={view.restoreAction} disabled={!view.canMutate || view.lifecycle.pending}>
              {view.labels.restore}
            </Button>
            <Button variant="outline" disabled={!view.canMutate} onClick={view.requestDelete}>
              {view.labels.delete}
            </Button>
          </>
        )}
      </nav>
      {view.restoreErrorKey && (
        <p role="alert" className={styles.restoreError()}>
          {view.restoreErrorText}
        </p>
      )}
      {view.pendingAction && (
        <ConfirmationModal
          title={view.confirmationTitle}
          text={view.confirmationText}
          yesLabel={view.labels[view.pendingAction]}
          noLabel={view.noLabel}
          yesDisabled={!view.canMutate || view.lifecycle.pending}
          onYes={view.confirmAction}
          onNo={view.cancelAction}
        />
      )}
      {view.actionErrorKey && (
        <p role="alert" className={styles.actionError()}>
          {view.actionErrorText}
        </p>
      )}
    </>
  );
}
