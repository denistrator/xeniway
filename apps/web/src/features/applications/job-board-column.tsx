import type { JobApplication, JobStatus } from "@xeniway/shared";
import type { DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { JobCard } from "./job-card";
import { getStatusLabel, statusStyles } from "./job-status";

export function JobBoardColumn({
  status,
  columnJobs,
  onDrop,
  onJobDrop,
  onDragStart,
  onKeyboardMove,
  onOpen,
}: {
  status: JobStatus;
  columnJobs: JobApplication[];
  onDrop: (event: React.DragEvent, status: JobStatus, jobs: JobApplication[]) => void;
  onJobDrop: (event: React.DragEvent, status: JobStatus, id: number, jobs: JobApplication[]) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, id: number) => void;
  onKeyboardMove: (
    id: number,
    status: JobStatus,
    direction: "up" | "down" | "first" | "last" | "previousStatus" | "nextStatus",
  ) => void;
  onOpen: (id: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <section
      aria-label={`${getStatusLabel(t, status)} applications`}
      className={`job-board-column min-h-64 rounded-2xl border border-line border-t-4 bg-surface-tint p-3 md:min-w-64 ${statusStyles[status].column}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, status, columnJobs)}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">{getStatusLabel(t, status)}</h2>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">
          {columnJobs.length}
        </span>
      </div>
      <ul className="list-none space-y-3 p-0">
        {columnJobs.map((job, index) => (
          <li
            key={job.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onJobDrop(event, status, job.id, columnJobs)}
          >
            <JobCard
              job={job}
              position={index + 1}
              total={columnJobs.length}
              onOpen={() => onOpen(job.id)}
              onKeyboardMove={(direction) => onKeyboardMove(job.id, status, direction)}
              onDragStart={(event) => onDragStart(event, job.id)}
            />
          </li>
        ))}
        {!columnJobs.length && (
          <li>
            <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-sm leading-6 text-muted">
              {t("applications.board.dropHere")}
            </p>
          </li>
        )}
      </ul>
    </section>
  );
}
