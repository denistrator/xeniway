import type { JobApplication, JobStatus } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { JobBoardColumn } from "./job-board-column";
import { jobStatuses } from "./job-status";
import { useJobBoard } from "./use-job-board";

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
  const navigate = useNavigate();
  const board = useJobBoard({ jobs, onStatusChange, onReorder });
  return (
    <div className="job-board-scroll w-full overflow-x-auto">
      <div className="grid grid-cols-1 gap-4 px-6 md:grid-flow-col md:grid-cols-[1fr_minmax(256px,1fr)]">
        {jobStatuses
          .filter((status) => board.visibleStatuses.includes(status))
          .map((status) => (
            <JobBoardColumn
              key={status}
              status={status}
              columnJobs={board.filteredJobs.filter((job) => job.status === status)}
              onDrop={board.handleColumnDrop}
              onJobDrop={board.handleJobDrop}
              onDragStart={board.handleDragStart}
              dropTarget={board.dropTarget}
              setDropTarget={board.setDropTarget}
              onKeyboardMove={(id, currentStatus, direction) => {
                if (direction === "previousStatus" || direction === "nextStatus")
                  board.moveToAdjacentStatus(id, currentStatus, direction);
                else board.reorderWithinStatus(currentStatus, id, direction);
              }}
              onOpen={(id) => navigate(`/applications/${id}`)}
            />
          ))}
      </div>
      {!board.filteredJobs.length && (
        <p role="status" aria-live="polite" className="px-6 pt-4 text-center text-sm text-muted">
          {t("applications.board.noMatch")}
        </p>
      )}
    </div>
  );
}
