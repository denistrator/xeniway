import type { ApplicationActivityEventProps } from "./application-activity.types";
import { useApplicationActivityEvent } from "./application-activity-event.model";

export function ApplicationActivityEvent(props: ApplicationActivityEventProps) {
  const { event, formattedOccurredAt } = props;
  const activity = useApplicationActivityEvent(props);
  const styles = activity.styles;
  return (
    <article className={styles.root()}>
      <div className={styles.layout()}>
        <div className={styles.content()}>
          <p className={styles.type()}>{activity.typeLabel}</p>
          {activity.showActions && <h4 className={styles.title()}>{event.title}</h4>}
          {activity.statusChange && <p className={styles.statusChange()}>{activity.statusChange}</p>}
          {event.description && <p className={styles.description()}>{event.description}</p>}
          <time className={styles.occurredAt()} dateTime={event.occurredAt}>
            {formattedOccurredAt}
          </time>
        </div>
        {activity.showActions && (
          <div className={styles.actions()}>
            <button
              type="button"
              className={styles.editButton()}
              aria-label={activity.editName}
              disabled={activity.actionsDisabled}
              onClick={activity.edit}
            >
              {activity.editLabel}
            </button>
            <button
              type="button"
              className={styles.deleteButton()}
              aria-label={activity.deleteName}
              disabled={activity.actionsDisabled}
              onClick={activity.remove}
            >
              {activity.deleteLabel}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
