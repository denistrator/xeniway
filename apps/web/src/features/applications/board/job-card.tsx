import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { JobApplication } from "@xeniway/shared";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../i18n/format";
import { useCanMutate } from "../../offline/offline-access";
import { getStatusLabel } from "./job-status";
import { jobStatusStyles } from "./job-status-styles";

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
  onDragStart: () => void;
  onKeyboardMove: (direction: "up" | "down" | "first" | "last" | "previousStatus" | "nextStatus") => void;
  position: number;
  total: number;
}) {
  const { i18n, t } = useTranslation();
  const canMutate = useCanMutate();
  const cardRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!cardRef.current || !canMutate) {
      return;
    }
    return draggable({
      element: cardRef.current,
      getInitialData: () => ({ type: "job-application", applicationId: job.id }),
      onDragStart,
    });
  }, [job.id, onDragStart, canMutate]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!canMutate) {
      return;
    }
    let direction: Parameters<typeof onKeyboardMove>[0] | null = null;
    if (event.shiftKey) {
      switch (event.key) {
        case "ArrowLeft":
          direction = "previousStatus";
          break;
        case "ArrowRight":
          direction = "nextStatus";
          break;
      }
    } else {
      switch (event.key) {
        case "ArrowUp":
          direction = "up";
          break;
        case "ArrowDown":
          direction = "down";
          break;
        case "Home":
          direction = "first";
          break;
        case "End":
          direction = "last";
          break;
      }
    }
    if (!direction) {
      return;
    }
    event.preventDefault();
    onKeyboardMove(direction);
  }

  return (
    <button
      type="button"
      ref={cardRef}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-keyshortcuts={canMutate ? "ArrowUp ArrowDown Home End Shift+ArrowLeft Shift+ArrowRight" : undefined}
      aria-label={`${job.company}, ${job.position}, ${getStatusLabel(t, job.status)}. ${t("applications.board.openDetails")}. Position ${position} of ${total}. ${t("applications.board.keyboardInstructions")}`}
      className="w-full cursor-grab rounded-xl border border-line bg-surface p-4 text-start shadow-sm transition-[background-color,box-shadow,transform] hover:-translate-y-1 hover:bg-surface-hover hover:shadow-lg active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-start gap-2 break-words font-semibold text-ink">
            <span
              aria-hidden="true"
              className={jobStatusStyles({ status: job.status }).marker({
                className: "mt-1.5 size-2 shrink-0 rounded-full",
              })}
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
