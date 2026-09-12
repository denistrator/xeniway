import type { JobApplication, JobStatus } from "@xeniway/shared";
import type { DragEvent } from "react";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { matchesApplicationSearch } from "../../lib/application-filters";
import { openEditDrawer, type RootState } from "../../store";
import { JobCard } from "./job-card";
import { getStatusLabel, jobStatuses, statusStyles } from "./job-status";

export { jobStatuses } from "./job-status";

export function JobBoard({
  jobs,
  onStatusChange,
  onReorder,
}: {
  jobs: JobApplication[];
  onStatusChange: (id: number, status: JobStatus) => void;
  onReorder: (status: JobStatus, applicationIds: number[]) => void;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { search, visibleStatuses } = useSelector((state: RootState) => state.ui);
  const draggedIdRef = useRef<number | null>(null);

  const filteredJobs = useMemo(() => {
    return [...jobs]
      .filter((job) => visibleStatuses.includes(job.status))
      .filter((job) => matchesApplicationSearch(job, search));
  }, [jobs, search, visibleStatuses]);

  function reorderWithinStatus(status: JobStatus, id: number, direction: "up" | "down" | "first" | "last") {
    const applicationIds = jobs
      .filter((job) => job.status === status)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((job) => job.id);
    const currentIndex = applicationIds.indexOf(id);
    if (currentIndex === -1) return;
    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : direction === "down"
          ? currentIndex + 1
          : direction === "first"
            ? 0
            : applicationIds.length - 1;
    if (targetIndex === currentIndex || targetIndex < 0 || targetIndex >= applicationIds.length) return;
    const [movedId] = applicationIds.splice(currentIndex, 1);
    applicationIds.splice(targetIndex, 0, movedId);
    onReorder(status, applicationIds);
  }

  function moveToAdjacentStatus(id: number, status: JobStatus, direction: "previousStatus" | "nextStatus") {
    const visibleStatusIndex = visibleStatuses.indexOf(status);
    const targetIndex = direction === "previousStatus" ? visibleStatusIndex - 1 : visibleStatusIndex + 1;
    const targetStatus = visibleStatuses[targetIndex];
    if (targetStatus) onStatusChange(id, targetStatus);
  }

  return (
    <div className="job-board-scroll overflow-x-auto w-full">
      <div className="grid grid-cols-1 gap-4 px-6 md:grid-flow-col md:grid-cols-[1fr_minmax(256px,1fr)]">
        {jobStatuses
          .filter((status) => visibleStatuses.includes(status))
          .map((status) => {
            const columnJobs = filteredJobs.filter((job) => job.status === status);
            return (
              <section
                key={status}
                aria-label={`${getStatusLabel(t, status)} applications`}
                className={`job-board-column min-h-64 rounded-2xl border border-line border-t-4 bg-surface-tint p-3 md:min-w-64 ${statusStyles[status].column}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const transferId = Number(event.dataTransfer.getData("text/plain"));
                  const id = Number.isInteger(transferId) && transferId > 0 ? transferId : draggedIdRef.current;
                  const source = id === null ? undefined : jobs.find((job) => job.id === id);
                  if (source && source.status === status) {
                    const applicationIds = columnJobs.filter((job) => job.id !== source.id).map((job) => job.id);
                    onReorder(status, [...applicationIds, source.id]);
                  } else if (id !== null) onStatusChange(id, status);
                  draggedIdRef.current = null;
                }}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink">
                    {getStatusLabel(t, status)}
                  </h2>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">
                    {columnJobs.length}
                  </span>
                </div>
                <ul className="space-y-3 list-none p-0">
                  {columnJobs.map((job) => (
                    <li
                      key={job.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const id = draggedIdRef.current;
                        if (id === null || id === job.id) return;
                        const source = jobs.find((candidate) => candidate.id === id);
                        if (!source || source.status !== status) {
                          if (source) onStatusChange(id, status);
                          draggedIdRef.current = null;
                          return;
                        }
                        const applicationIds = [
                          ...columnJobs.filter((candidate) => candidate.id !== id).map((candidate) => candidate.id),
                        ];
                        const targetIndex = applicationIds.indexOf(job.id);
                        applicationIds.splice(targetIndex, 0, id);
                        onReorder(status, applicationIds);
                        draggedIdRef.current = null;
                      }}
                    >
                      <JobCard
                        job={job}
                        position={columnJobs.findIndex((candidate) => candidate.id === job.id) + 1}
                        total={columnJobs.length}
                        onOpen={() => dispatch(openEditDrawer(job.id))}
                        onKeyboardMove={(direction) => {
                          if (direction === "previousStatus" || direction === "nextStatus")
                            moveToAdjacentStatus(job.id, status, direction);
                          else reorderWithinStatus(status, job.id, direction);
                        }}
                        onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                          event.dataTransfer.setData("text/plain", String(job.id));
                          draggedIdRef.current = job.id;
                        }}
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
          })}
      </div>
      {!filteredJobs.length && (
        <p role="status" aria-live="polite" className="px-6 pt-4 text-center text-sm text-muted">
          {t("applications.board.noMatch")}
        </p>
      )}
    </div>
  );
}
