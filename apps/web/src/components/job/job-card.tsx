import type { JobApplication } from "@job-tracker/shared";
import { statusLabels, statusStyles } from "./job-status";

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
      aria-label={`${job.company}, ${job.position}, ${statusLabels[job.status]}. Position ${position} of ${total}. Use Arrow Up or Arrow Down to reorder, Home or End to move to an edge, and Shift plus Arrow Left or Right to change status.`}
      className={`w-full cursor-grab rounded-xl border border-line border-l-4 bg-surface p-4 text-left shadow-sm transition-[background-color,box-shadow,transform] hover:-translate-y-1 hover:bg-surface-hover hover:shadow-lg active:cursor-grabbing ${statusStyles[job.status].card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{job.company}</p>
          <p className="mt-1 text-sm text-muted">{job.position}</p>
        </div>
      </div>
      {job.description && <p className="mt-3 line-clamp-2 text-sm text-muted">{job.description}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {job.location && <span>{job.location}</span>}
        {job.appliedAt && <span>Applied {job.appliedAt}</span>}
      </div>
    </button>
  );
}
