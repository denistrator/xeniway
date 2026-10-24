import { Link } from "react-router-dom";
import { useOfflineTaskNotice } from "./offline-task-notice.model";
import { offlineTaskNoticeStyles } from "./offline-task-notice.styles";

const styles = offlineTaskNoticeStyles();

export function OfflineTaskNotice() {
  const view = useOfflineTaskNotice();
  if (!view.visible) {
    return null;
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
