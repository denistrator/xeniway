import { useWelcomeModal, type WelcomeModalProps } from "./welcome-modal.model";
import { welcomeModalStyles } from "./welcome-modal.styles";
import { WelcomeModalContent } from "./welcome-modal-content.view";

const styles = welcomeModalStyles();

export type { WelcomeAction } from "./welcome-modal.model";

export function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const { t, labels, closeRef, complete, handleStay } = useWelcomeModal({ onComplete });
  return (
    <div className={styles.overlay()}>
      <button
        type="button"
        aria-label={labels.close}
        tabIndex={-1}
        className={styles.backdrop()}
        onClick={handleStay}
      />
      <WelcomeModalContent t={t} closeRef={closeRef} complete={complete} />
    </div>
  );
}
