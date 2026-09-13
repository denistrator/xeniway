import type { JobApplication, JobStatus } from "@xeniway/shared";
import { useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { matchesApplicationSearch } from "../../lib/application-filters";
import type { RootState } from "../../store";
import { insertApplication, type MoveDirection, moveApplication } from "./application-order";

type StatusDirection = "previousStatus" | "nextStatus";

export function useJobBoard({
  jobs,
  onStatusChange,
  onReorder,
}: {
  jobs: JobApplication[];
  onStatusChange: (id: number, status: JobStatus) => void;
  onReorder: (status: JobStatus, applicationIds: number[]) => void;
}) {
  const dispatch = useDispatch();
  const { search, visibleStatuses } = useSelector((state: RootState) => state.ui);
  const draggedIdRef = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: JobStatus; index: number } | null>(null);
  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => visibleStatuses.includes(job.status)).filter((job) => matchesApplicationSearch(job, search)),
    [jobs, search, visibleStatuses],
  );

  function reorderWithinStatus(status: JobStatus, id: number, direction: MoveDirection) {
    const applicationIds = jobs
      .filter((job) => job.status === status)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((job) => job.id);
    const reordered = moveApplication(applicationIds, id, direction);
    if (reordered) onReorder(status, reordered);
  }

  function moveToAdjacentStatus(id: number, status: JobStatus, direction: StatusDirection) {
    const index = visibleStatuses.indexOf(status);
    const targetStatus = visibleStatuses[direction === "previousStatus" ? index - 1 : index + 1];
    if (targetStatus) onStatusChange(id, targetStatus);
  }

  function handleColumnDrop(id: number, status: JobStatus, columnJobs: JobApplication[]) {
    const source = id === null ? undefined : jobs.find((job) => job.id === id);
    if (source && source.status === status)
      onReorder(status, [...columnJobs.filter((job) => job.id !== source.id).map((job) => job.id), source.id]);
    else if (id !== null) onStatusChange(id, status);
    draggedIdRef.current = null;
    setDropTarget(null);
  }

  function handleJobDrop(id: number, status: JobStatus, targetId: number, columnJobs: JobApplication[]) {
    if (id === targetId) {
      draggedIdRef.current = null;
      setDropTarget(null);
      return;
    }
    const source = jobs.find((job) => job.id === id);
    if (!source || source.status !== status) {
      if (source) onStatusChange(id, status);
      draggedIdRef.current = null;
      return;
    }
    const applicationIds = columnJobs.filter((job) => job.id !== id).map((job) => job.id);
    const reordered = insertApplication(applicationIds, id, targetId);
    if (reordered) onReorder(status, reordered);
    draggedIdRef.current = null;
    setDropTarget(null);
  }

  function handleDragStart(id: number) {
    draggedIdRef.current = id;
    setDropTarget(null);
  }

  return {
    dispatch,
    visibleStatuses,
    filteredJobs,
    draggedIdRef,
    reorderWithinStatus,
    moveToAdjacentStatus,
    handleColumnDrop,
    handleJobDrop,
    handleDragStart,
    dropTarget,
    setDropTarget,
  };
}
