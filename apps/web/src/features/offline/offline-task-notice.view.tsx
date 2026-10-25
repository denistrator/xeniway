import { Link } from "react-router-dom";
import { InfoMessage } from "../../components/ui/info-message.view";
import { useOfflineTaskNotice } from "./offline-task-notice.model";
import { offlineTaskNoticeStyles } from "./offline-task-notice.styles";

const styles = offlineTaskNoticeStyles();

export function OfflineTaskNotice() {
  const view = useOfflineTaskNotice();
  if (!view.visible) {
    return null;
  }
  if (view.informational) {
    return (
      <InfoMessage messageId={view.messageId} className={styles.info()}>
        <p className={styles.message()}>{view.message}</p>
        <Link to="/settings" className={styles.settingsLink()}>
          {view.settingsLabel}
        </Link>
      </InfoMessage>
    );
  }
  return (
    <aside className={styles.root()}>
      <p role="status" className={styles.message()}>
        {view.message}
      </p>
      <Link to="/settings" className={styles.settingsLink()}>
        {view.settingsLabel}
      </Link>
    </aside>
  );
}
