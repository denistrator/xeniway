import type { ApplicationEvent } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { ApplicationActivityEvent } from "./application-activity-event";

export function ApplicationActivityTimeline({
  events,
  onEdit,
  onDelete,
}: {
  events: ApplicationEvent[];
  onEdit: (event: ApplicationEvent) => void;
  onDelete: (event: ApplicationEvent) => void;
}) {
  const { t } = useTranslation();
  if (events.length === 0) return <p className="text-sm text-muted">{t("applications.activity.empty")}</p>;

  return (
    <ol aria-label={t("applications.activity.timeline")} className="space-y-3">
      {[...events]
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id - left.id)
        .map((event) => (
          <li key={event.id}>
            <ApplicationActivityEvent event={event} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
    </ol>
  );
}
