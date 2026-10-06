import type { ApplicationEvent } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { tv } from "tailwind-variants";

const activityEventStyles = tv({
  base: "rounded-xl border border-line p-4",
  variants: { system: { true: "bg-surface-tint", false: "bg-surface" } },
});

export function ApplicationActivityEvent({
  event,
  formattedOccurredAt,
  onEdit,
  onDelete,
}: {
  event: ApplicationEvent;
  formattedOccurredAt: string;
  onEdit: (event: ApplicationEvent) => void;
  onDelete: (event: ApplicationEvent) => void;
}) {
  const { t } = useTranslation();
  const label = t(`applications.activity.types.${event.type}`);
  return (
    <article className={activityEventStyles({ system: event.isSystem })}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          {!event.isSystem && <h4 className="mt-1 font-medium text-ink break-words">{event.title}</h4>}
          {event.type === "status_changed" && event.metadata && (
            <p className="mt-1 text-sm text-muted">
              {t(`applications.status.${event.metadata.from}`)} → {t(`applications.status.${event.metadata.to}`)}
            </p>
          )}
          {event.description && (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">{event.description}</p>
          )}
          <time className="mt-2 block text-xs text-muted" dateTime={event.occurredAt}>
            {formattedOccurredAt}
          </time>
        </div>
        {!event.isSystem && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="rounded px-2 py-1 text-sm text-accent hover:bg-surface-hover focus-visible:outline-2"
              aria-label={t("applications.activity.editNamed", { title: event.title })}
              onClick={() => onEdit(event)}
            >
              {t("applications.activity.edit")}
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm text-rose-600 hover:bg-surface-hover focus-visible:outline-2"
              aria-label={t("applications.activity.deleteNamed", { title: event.title })}
              onClick={() => onDelete(event)}
            >
              {t("applications.activity.delete")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
