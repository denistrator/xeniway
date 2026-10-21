import { createPortal } from "react-dom";
import { Button } from "./button.view";
import { type ConfirmationModalProps, useConfirmationModal } from "./confirmation-modal.model";
import { confirmationModalStyles } from "./confirmation-modal.styles";

const styles = confirmationModalStyles();

export function ConfirmationModal(props: ConfirmationModalProps) {
  const { title, text, yesLabel, noLabel, onYes, onNo, yesDisabled = false, dismissAction } = props;
  const view = useConfirmationModal(props);
  return createPortal(
    <div ref={view.rootRef} className={styles.root()}>
      <button
        type="button"
        aria-label={view.dismissLabel}
        tabIndex={-1}
        className={styles.backdrop()}
        onClick={view.dismiss}
      />
      <div
        ref={view.dialogRef}
        onKeyDownCapture={view.handleKeyDown}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={view.titleId}
        aria-describedby={text ? view.textId : undefined}
        className={styles.dialog()}
      >
        <h2 id={view.titleId} className={styles.heading()}>
          {title}
        </h2>
        {text && (
          <p id={view.textId} className={styles.text()}>
            {text}
          </p>
        )}
        <div className={styles.actions()}>
          <Button ref={view.noButtonRef} variant="outline" onClick={view.dismiss}>
            {view.dismissLabel}
          </Button>
          {dismissAction && (
            <Button variant="outline" onClick={onNo}>
              {noLabel}
            </Button>
          )}
          <Button onClick={onYes} disabled={yesDisabled}>
            {yesLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
