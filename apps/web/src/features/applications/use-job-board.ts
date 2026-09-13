import type { JobApplication, JobStatus } from "@xeniway/shared";
import type { DragEvent } from "react";
import { useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { matchesApplicationSearch } from "../../lib/application-filters";
import type { RootState } from "../../store";

type MoveDirection = "up" | "down" | "first" | "last";
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
    const currentIndex = applicationIds.indexOf(id);
    if (currentIndex === -1) return;
    const targetIndex = { up: currentIndex - 1, down: currentIndex + 1, first: 0, last: applicationIds.length - 1 }[
      direction
    ];
    if (targetIndex === currentIndex || targetIndex < 0 || targetIndex >= applicationIds.length) return;
    const [movedId] = applicationIds.splice(currentIndex, 1);
    applicationIds.splice(targetIndex, 0, movedId);
    onReorder(status, applicationIds);
  }

  function moveToAdjacentStatus(id: number, status: JobStatus, direction: StatusDirection) {
    const index = visibleStatuses.indexOf(status);
    const targetStatus = visibleStatuses[direction === "previousStatus" ? index - 1 : index + 1];
    if (targetStatus) onStatusChange(id, targetStatus);
  }

  function handleColumnDrop(event: React.DragEvent, status: JobStatus, columnJobs: JobApplication[]) {
    event.preventDefault();
    const transferId = Number(event.dataTransfer.getData("text/plain"));
    const id = Number.isInteger(transferId) && transferId > 0 ? transferId : draggedIdRef.current;
    const source = id === null ? undefined : jobs.find((job) => job.id === id);
    if (source && source.status === status)
      onReorder(status, [...columnJobs.filter((job) => job.id !== source.id).map((job) => job.id), source.id]);
    else if (id !== null) onStatusChange(id, status);
    draggedIdRef.current = null;
  }

  function handleJobDrop(event: React.DragEvent, status: JobStatus, targetId: number, columnJobs: JobApplication[]) {
    event.preventDefault();
    event.stopPropagation();
    const id = draggedIdRef.current;
    if (id === null || id === targetId) return;
    const source = jobs.find((job) => job.id === id);
    if (!source || source.status !== status) {
      if (source) onStatusChange(id, status);
      draggedIdRef.current = null;
      return;
    }
    const applicationIds = columnJobs.filter((job) => job.id !== id).map((job) => job.id);
    applicationIds.splice(applicationIds.indexOf(targetId), 0, id);
    onReorder(status, applicationIds);
    draggedIdRef.current = null;
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, id: number) {
    event.dataTransfer.setData("text/plain", String(id));
    draggedIdRef.current = id;
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
  };
}
