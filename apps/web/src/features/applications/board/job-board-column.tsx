import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { JobApplication, JobStatus } from "@xeniway/shared";
import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { JobCard } from "./job-card";
import { getStatusLabel, statusStyles } from "./job-status";

export function JobBoardColumn({
  status,
  columnJobs,
  onDrop,
  onJobDrop,
  onDragStart,
  dropTarget,
  setDropTarget,
  onKeyboardMove,
  onOpen,
}: {
  status: JobStatus;
  columnJobs: JobApplication[];
  onDrop: (id: number, status: JobStatus, jobs: JobApplication[]) => void;
  onJobDrop: (id: number, status: JobStatus, targetId: number, jobs: JobApplication[]) => void;
  onDragStart: (id: number) => void;
  dropTarget: { status: JobStatus; index: number } | null;
  setDropTarget: (target: { status: JobStatus; index: number } | null) => void;
  onKeyboardMove: (
    id: number,
    status: JobStatus,
    direction: "up" | "down" | "first" | "last" | "previousStatus" | "nextStatus",
  ) => void;
  onOpen: (id: number) => void;
}) {
  const { t } = useTranslation();
  const columnRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!columnRef.current) return;
    return dropTargetForElements({
      element: columnRef.current,
      canDrop: ({ source }) => source.data.type === "job-application",
      getData: () => ({ status, index: columnJobs.length }),
      onDragEnter: () => setDropTarget({ status, index: columnJobs.length }),
      onDrop: ({ source, location, self }) => {
        if (location.current.dropTargets[0]?.element !== self.element) return;
        onDrop(Number(source.data.applicationId), status, columnJobs);
      },
    });
  }, [columnJobs, onDrop, setDropTarget, status]);
  return (
    <section
      ref={columnRef}
      aria-label={`${getStatusLabel(t, status)} applications`}
      className={`job-board-column min-h-64 rounded-2xl border border-line border-t-4 bg-surface-tint p-3 md:min-w-64 ${statusStyles[status].column}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">{getStatusLabel(t, status)}</h2>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">
          {columnJobs.length}
        </span>
      </div>
      <ul className="list-none space-y-3 p-0">
        {columnJobs.map((job, index) => (
          <Fragment key={job.id}>
            {dropTarget?.status === status && dropTarget.index === index && (
              <DropPlaceholder
                status={status}
                targetId={job.id}
                onDrop={(id) => onJobDrop(id, status, job.id, columnJobs)}
              />
            )}
            <DropTargetItem
              status={status}
              index={index}
              targetId={job.id}
              onDrop={onJobDrop}
              onDragEnter={() => setDropTarget({ status, index })}
              jobs={columnJobs}
            >
              <JobCard
                job={job}
                position={index + 1}
                total={columnJobs.length}
                onOpen={() => onOpen(job.id)}
                onKeyboardMove={(direction) => onKeyboardMove(job.id, status, direction)}
                onDragStart={() => onDragStart(job.id)}
              />
            </DropTargetItem>
          </Fragment>
        ))}
        {dropTarget?.status === status && dropTarget.index === columnJobs.length && <DropPlaceholder status={status} />}
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

function DropTargetItem({
  status,
  index,
  targetId,
  jobs,
  onDrop,
  onDragEnter,
  children,
}: {
  status: JobStatus;
  index: number;
  targetId: number;
  jobs: JobApplication[];
  onDrop: (id: number, status: JobStatus, targetId: number, jobs: JobApplication[]) => void;
  onDragEnter: () => void;
  children: ReactNode;
}) {
  const itemRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!itemRef.current) return;
    return dropTargetForElements({
      element: itemRef.current,
      canDrop: ({ source }) => source.data.type === "job-application",
      getData: () => ({ status, index, targetId }),
      onDragEnter,
      onDrop: ({ source }) => onDrop(Number(source.data.applicationId), status, targetId, jobs),
    });
  }, [index, jobs, onDragEnter, onDrop, status, targetId]);
  return <li ref={itemRef}>{children}</li>;
}

function DropPlaceholder({
  status,
  targetId,
  onDrop,
}: {
  status: JobStatus;
  targetId?: number;
  onDrop?: (id: number) => void;
}) {
  const placeholderRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!placeholderRef.current || targetId === undefined || !onDrop) return;
    return dropTargetForElements({
      element: placeholderRef.current,
      canDrop: ({ source }) => source.data.type === "job-application",
      getData: () => ({ status, targetId }),
      onDrop: ({ source }) => onDrop(Number(source.data.applicationId)),
    });
  }, [onDrop, status, targetId]);
  return (
    <li
      ref={placeholderRef}
      aria-hidden="true"
      className="h-20 rounded-xl border-2 border-dashed border-accent bg-accent-soft"
    />
  );
}
