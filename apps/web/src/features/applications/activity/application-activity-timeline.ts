import type { ApplicationEvent } from "@xeniway/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { applicationActivityTimelineStyles } from "./application-activity-timeline.styles";

const styles = applicationActivityTimelineStyles();

export function useApplicationActivityTimeline(events: ApplicationEvent[]) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "en";
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );
  const items = [...events]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id - left.id)
    .map((event) => ({
      event,
      formattedOccurredAt: dateFormatter.format(new Date(event.occurredAt)),
    }));

  return {
    items,
    isEmpty: items.length === 0,
    emptyLabel: t("applications.activity.empty"),
    timelineLabel: t("applications.activity.timeline"),
    styles,
  };
}
