import type { JobApplication, JobStatus } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { jobStatuses } from "./job-status";
import { useJobBoard } from "./use-job-board";

export type JobBoardProps = {
  jobs: JobApplication[];
  onStatusChange: (id: number, status: JobStatus) => void;
  onReorder: (status: JobStatus, applicationIds: number[]) => void;
  operationError?: string;
};

export function useJobBoardPresentation({ jobs, onStatusChange, onReorder, operationError }: JobBoardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const board = useJobBoard({ jobs, onStatusChange, onReorder });
  const columns = jobStatuses
    .filter((status) => board.visibleStatuses.includes(status))
    .map((status) => ({ status, jobs: board.filteredJobs.filter((job) => job.status === status) }));
  const moveJob = (
    id: number,
    currentStatus: JobStatus,
    direction: "up" | "down" | "first" | "last" | "previousStatus" | "nextStatus",
  ) => {
    if (direction === "previousStatus" || direction === "nextStatus") {
      board.moveToAdjacentStatus(id, currentStatus, direction);
    } else {
      board.reorderWithinStatus(currentStatus, id, direction);
    }
  };
  const openJob = (id: number) => navigate(`/applications/${id}`);
  const noMatchLabel = t("applications.board.noMatch");
  return { board, columns, moveJob, openJob, noMatchLabel, operationError };
}
