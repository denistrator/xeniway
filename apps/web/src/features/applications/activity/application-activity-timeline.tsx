import type { ApplicationActivityTimelineProps } from "./application-activity.types";
import { ApplicationActivityEvent } from "./application-activity-event.tsx";
import { useApplicationActivityTimeline } from "./application-activity-timeline.ts";

export function ApplicationActivityTimeline({ events, onEdit, onDelete }: ApplicationActivityTimelineProps) {
  const timeline = useApplicationActivityTimeline(events);
  const styles = timeline.styles;
  if (timeline.isEmpty) {
    return <p className={styles.empty()}>{timeline.emptyLabel}</p>;
  }
  return (
    <ol aria-label={timeline.timelineLabel} className={styles.list()}>
      {timeline.items.map((item) => (
        <li key={item.event.id} className={styles.item()}>
          <ApplicationActivityEvent
            event={item.event}
            formattedOccurredAt={item.formattedOccurredAt}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ol>
  );
}
