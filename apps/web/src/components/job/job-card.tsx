import type { JobApplication } from "@job-tracker/shared";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../i18n/format";
import { getStatusLabel, statusStyles } from "./job-status";

export function JobCard({
  job,
  onOpen,
  onDragStart,
  onKeyboardMove,
  position,
  total,
}: {
  job: JobApplication;
  onOpen: () => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onKeyboardMove: (direction: "up" | "down" | "first" | "last" | "previousStatus" | "nextStatus") => void;
  position: number;
  total: number;
}) {
  const { i18n, t } = useTranslation();
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      onKeyDown={(event) => {
        const direction = event.shiftKey
          ? event.key === "ArrowLeft"
            ? "previousStatus"
            : event.key === "ArrowRight"
              ? "nextStatus"
              : null
          : event.key === "ArrowUp"
            ? "up"
            : event.key === "ArrowDown"
              ? "down"
              : event.key === "Home"
                ? "first"
                : event.key === "End"
                  ? "last"
                  : null;
        if (!direction) return;
        event.preventDefault();
        onKeyboardMove(direction);
      }}
      aria-keyshortcuts="ArrowUp ArrowDown Home End Shift+ArrowLeft Shift+ArrowRight"
      aria-label={`${job.company}, ${job.position}, ${getStatusLabel(t, job.status)}. Position ${position} of ${total}. ${t("applications.board.keyboardInstructions")}`}
      className="w-full cursor-grab rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition-[background-color,box-shadow,transform] hover:-translate-y-1 hover:bg-surface-hover hover:shadow-lg active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-start gap-2 break-words font-semibold text-ink">
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2 shrink-0 rounded-full ${statusStyles[job.status].marker}`}
            />
            <span>{job.company}</span>
          </p>
          <p className="mt-1 break-words text-sm leading-6 text-muted">{job.position}</p>
        </div>
      </div>
      {job.description && (
        <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-muted">{job.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-sm leading-6 text-muted">
        {job.location && <span className="break-words">{job.location}</span>}
        {job.appliedAt && (
          <span>
            {t("applications.board.applied", { date: formatDate(job.appliedAt, i18n.resolvedLanguage ?? "en") })}
          </span>
        )}
      </div>
    </button>
  );
}
