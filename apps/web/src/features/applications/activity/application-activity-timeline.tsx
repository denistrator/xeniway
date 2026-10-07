import type { ApplicationEvent } from "@xeniway/shared";
import { useMemo } from "react";
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
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "en";
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );
  if (events.length === 0) {
    return <p className="text-sm text-muted">{t("applications.activity.empty")}</p>;
  }

  return (
    <ol aria-label={t("applications.activity.timeline")} className="space-y-3 max-h-screen overflow-y-auto">
      {[...events]
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id - left.id)
        .map((event) => (
          <li key={event.id}>
            <ApplicationActivityEvent
              event={event}
              formattedOccurredAt={dateFormatter.format(new Date(event.occurredAt))}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </li>
        ))}
    </ol>
  );
}
