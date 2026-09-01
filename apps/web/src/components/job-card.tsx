import type { JobApplication } from "@job-tracker/shared";
import { Badge } from "./ui/badge";

const statusLabels: Record<JobApplication["status"], string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function JobCard({
  job,
  onOpen,
  onDragStart,
}: {
  job: JobApplication;
  onOpen: () => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="w-full cursor-grab rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{job.company}</p>
          <p className="mt-1 text-sm text-slate-600">{job.position}</p>
        </div>
        <Badge variant={job.status === "offer" ? "success" : job.status === "rejected" ? "warning" : "neutral"}>
          {statusLabels[job.status]}
        </Badge>
      </div>
      {job.description && <p className="mt-3 line-clamp-2 text-sm text-slate-500">{job.description}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        {job.location && <span>{job.location}</span>}
        {job.appliedAt && <span>Applied {job.appliedAt}</span>}
      </div>
    </button>
  );
}
