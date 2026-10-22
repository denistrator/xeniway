import type { JobApplication, JobStatus } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { type RootState, setAllStatuses, setSearch } from "../../../store";
import { useJobBoard } from "./use-job-board";

export type JobBoardProps = {
  jobs: JobApplication[];
  onStatusChange: (id: number, status: JobStatus) => void;
  onReorder: (status: JobStatus, applicationIds: number[]) => void;
  operationError?: string;
  operationSuccess?: string;
};

export function useJobBoardPresentation({
  jobs,
  onStatusChange,
  onReorder,
  operationError,
  operationSuccess,
}: JobBoardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const search = useSelector((state: RootState) => state.ui.search);
  const board = useJobBoard({ jobs, onStatusChange, onReorder });
  const columns = board.displayedStatuses.map((status) => ({
    status,
    jobs: board.filteredJobs.filter((job) => job.status === status),
  }));
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
  const hasSearch = Boolean(search.trim());
  const hasVisibleStatuses = board.displayedStatuses.length > 0;
  const canShowAllStatuses = !hasVisibleStatuses;
  const canClearSearch = hasSearch;
  const noMatchLabel = t("applications.board.noMatch");
  const emptyLabel = canShowAllStatuses ? t("applications.board.noStatuses") : noMatchLabel;
  const showAllStatuses = () => dispatch(setAllStatuses(true));
  const clearSearch = () => dispatch(setSearch(""));
  return {
    board,
    columns,
    moveJob,
    openJob,
    emptyLabel,
    canShowAllStatuses,
    canClearSearch,
    showAllStatuses,
    clearSearch,
    showAllStatusesLabel: t("applications.board.showAllStatuses"),
    clearSearchLabel: t("applications.clearSearch"),
    operationError,
    operationSuccess,
  };
}
