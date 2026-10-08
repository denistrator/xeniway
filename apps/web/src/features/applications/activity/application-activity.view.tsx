import { useApplicationActivity } from "./application-activity.model";
import type { ApplicationActivityProps } from "./application-activity.types";
import { ApplicationActivitySection } from "./application-activity-section.view";

export function ApplicationActivity({ applicationId }: ApplicationActivityProps) {
  const activity = useApplicationActivity(applicationId);
  const styles = activity.styles;

  if (activity.detail) {
    return <ApplicationActivitySection applicationId={applicationId} events={activity.detail.events} />;
  }

  return (
    <section aria-labelledby={activity.headingId} className={styles.root()}>
      <div className={styles.header()}>
        <h3 id={activity.headingId} className={styles.heading()}>
          {activity.heading}
        </h3>
        <button type="button" aria-disabled="true" className={styles.addButton()}>
          {activity.addLabel}
        </button>
      </div>
      <div className={styles.feedback()} aria-live="polite">
        {activity.message && <p className={styles.message()}>{activity.message}</p>}
        {activity.showError && (
          <p role="alert" className={styles.error()}>
            {activity.errorLabel}{" "}
            <button type="button" onClick={activity.retry} className={styles.retryButton()}>
              {activity.retryLabel}
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
