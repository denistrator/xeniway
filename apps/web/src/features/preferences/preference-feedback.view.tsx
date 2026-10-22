import { X } from "lucide-react";
import { type PreferenceFeedbackProps, usePreferenceFeedback } from "./preference-feedback.model";
import { preferenceFeedbackStyles } from "./preference-feedback.styles";

const styles = preferenceFeedbackStyles();

export function PreferenceFeedback(props: PreferenceFeedbackProps) {
  const view = usePreferenceFeedback(props);
  if (!view.visible) {
    return null;
  }
  return (
    <div className={styles.root({ compact: view.compact })} role="status" aria-live="polite" aria-atomic="true">
      {view.compact && (
        <button className={styles.dismiss()} type="button" aria-label={view.dismissLabel} onClick={view.dismiss}>
          <X className={styles.dismissIcon()} aria-hidden="true" size={16} />
        </button>
      )}
      {view.accountText && (
        <p className={styles.accountMessage()}>
          {view.accountText}
          {view.retryAccount && (
            <button className={styles.retryAccount()} type="button" onClick={view.retryAccount}>
              {view.retryAccountLabel}
            </button>
          )}
        </p>
      )}
      {view.storageText && (
        <p className={styles.storageMessage()}>
          {view.storageText}
          <button className={styles.retryStorage()} type="button" onClick={view.retryStorage}>
            {view.retryStorageLabel}
          </button>
        </p>
      )}
      {view.dictionaryText && (
        <p className={styles.dictionaryMessage()}>
          {view.dictionaryText}
          <button className={styles.retryDictionary()} type="button" onClick={view.retryDictionary}>
            {view.retryDictionaryLabel}
          </button>
        </p>
      )}
    </div>
  );
}
