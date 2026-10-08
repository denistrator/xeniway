import { X } from "lucide-react";
import { Button } from "../../components/ui/button.view";
import { LanguageSelector } from "../preferences/language-selector.view";
import { useWelcomeModalContent, type WelcomeModalContentProps } from "./welcome-modal-content.model";
import { welcomeModalContentStyles } from "./welcome-modal-content.styles";

const styles = welcomeModalContentStyles();

export function WelcomeModalContent({ t, closeRef, complete }: WelcomeModalContentProps) {
  const { labels, handleStay, handleAbout, handleBoard } = useWelcomeModalContent({
    t,
    complete,
  });
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
      className={styles.dialog()}
    >
      <div className={styles.header()}>
        <LanguageSelector />
        <button
          ref={closeRef}
          type="button"
          aria-label={labels.close}
          className={styles.closeButton()}
          onClick={handleStay}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      <div className={styles.introduction()}>
        <h2 id="welcome-title" className={styles.title()}>
          {labels.title}
        </h2>
        <p id="welcome-description" className={styles.description()}>
          {labels.introduction}
        </p>
        <p className={styles.features()}>{labels.features}</p>
      </div>
      <div className={styles.actions()}>
        <Button variant="outline" onClick={handleAbout}>
          {labels.about}
        </Button>
        <Button onClick={handleBoard}>{labels.goToBoard}</Button>
      </div>
    </div>
  );
}
