import { Button } from "./button.tsx";
import { confirmationModalStyles } from "./confirmation-modal.styles";
import { type ConfirmationModalProps, useConfirmationModal } from "./confirmation-modal.ts";

const styles = confirmationModalStyles();

export function ConfirmationModal({
  title,
  text,
  yesLabel,
  noLabel,
  onYes,
  onNo,
  yesDisabled = false,
}: ConfirmationModalProps) {
  const view = useConfirmationModal(onNo);
  return (
    <div className={styles.root()}>
      <button type="button" aria-label={noLabel} tabIndex={-1} className={styles.backdrop()} onClick={onNo} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby={text ? "confirmation-text" : undefined}
        className={styles.dialog()}
      >
        <h2 id="confirmation-title" className={styles.heading()}>
          {title}
        </h2>
        {text && (
          <p id="confirmation-text" className={styles.text()}>
            {text}
          </p>
        )}
        <div className={styles.actions()}>
          <Button ref={view.noButtonRef} variant="outline" onClick={onNo}>
            {noLabel}
          </Button>
          <Button onClick={onYes} disabled={yesDisabled}>
            {yesLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
