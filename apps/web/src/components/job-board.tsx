import type { JobApplication, JobStatus } from "@job-tracker/shared";
import type { DragEvent } from "react";
import { useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { openEditDrawer, type RootState } from "../store";
import { JobCard } from "./job-card";

export const jobStatuses: JobStatus[] = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"];
const statusLabels: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function JobBoard({
  jobs,
  onStatusChange,
}: {
  jobs: JobApplication[];
  onStatusChange: (id: number, status: JobStatus) => void;
}) {
  const dispatch = useDispatch();
  const { search, visibleStatuses } = useSelector((state: RootState) => state.ui);
  const draggedIdRef = useRef<number | null>(null);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...jobs]
      .filter((job) => visibleStatuses.includes(job.status))
      .filter(
        (job) =>
          !query ||
          [job.company, job.position, job.location ?? ""].some((value) => value.toLowerCase().includes(query)),
      );
  }, [jobs, search, visibleStatuses]);

  return (
    <div className="job-board-scroll w-full">
      <div className="grid grid-cols-1 gap-4 px-6 md:grid-flow-col md:grid-cols-[minmax(256px,1fr)]">
        {jobStatuses
          .filter((status) => visibleStatuses.includes(status))
          .map((status) => {
            const columnJobs = filteredJobs.filter((job) => job.status === status);
            return (
              <section
                key={status}
                aria-label={`${statusLabels[status]} applications`}
                className="job-board-column min-h-64 rounded-2xl border border-slate-200 bg-slate-100/70 p-3 dark:border-slate-700 dark:bg-slate-800/70 md:min-w-64"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const transferId = Number(event.dataTransfer.getData("text/plain"));
                  const id = Number.isInteger(transferId) && transferId > 0 ? transferId : draggedIdRef.current;
                  if (id !== null) onStatusChange(id, status);
                  draggedIdRef.current = null;
                }}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{statusLabels[status]}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    {columnJobs.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onOpen={() => dispatch(openEditDrawer(job.id))}
                      onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                        event.dataTransfer.setData("text/plain", String(job.id));
                        draggedIdRef.current = job.id;
                      }}
                    />
                  ))}
                  {!columnJobs.length && (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
                      Drop applications here
                    </p>
                  )}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
