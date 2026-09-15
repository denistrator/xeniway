import type { ApplicationEvent } from "@xeniway/shared";
import { useTranslation } from "react-i18next";

export function ApplicationActivityEvent({
  event,
  onEdit,
  onDelete,
}: {
  event: ApplicationEvent;
  onEdit: (event: ApplicationEvent) => void;
  onDelete: (event: ApplicationEvent) => void;
}) {
  const { t, i18n } = useTranslation();
  const label = t(`applications.activity.types.${event.type}`);
  return (
    <article
      className={`rounded-xl border p-4 ${event.isSystem ? "border-line bg-surface-tint" : "border-line bg-surface"}`}
    >
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
            {new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "en", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(event.occurredAt),
            )}
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
