import { Button } from "../../components/ui/button.view";
import { useLogoutDestinationNotice } from "./logout-destination-notice.model";
import { logoutDestinationNoticeStyles } from "./logout-destination-notice.styles";

const styles = logoutDestinationNoticeStyles();

export function LogoutDestinationNotice() {
  const view = useLogoutDestinationNotice();
  if (!view.visible) {
    return null;
  }
  return (
    <section aria-label={view.title} className={styles.root()}>
      <h2 className={styles.heading()}>{view.title}</h2>
      <div role="status" className={styles.status()}>
        {view.unconfirmed && <p className={styles.description()}>{view.description}</p>}
        {view.storageFailed && <p className={styles.persistenceWarning()}>{view.persistenceWarning}</p>}
        {view.failed && <p className={styles.failure()}>{view.failure}</p>}
      </div>
      {view.unconfirmed && (
        <Button
          type="button"
          variant="outline"
          disabled={view.pending}
          onClick={view.finish}
          className={styles.finishButton()}
        >
          {view.finishLabel}
        </Button>
      )}
    </section>
  );
}
