import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { JobApplication, JobStatus } from "@xeniway/shared";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getStatusLabel } from "./job-status.ts";

export type JobBoardColumnProps = {
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
};

export type DropTargetItemProps = {
  status: JobStatus;
  index: number;
  targetId: number;
  jobs: JobApplication[];
  onDrop: (id: number, status: JobStatus, targetId: number, jobs: JobApplication[]) => void;
  onDragEnter: () => void;
  children: ReactNode;
};

export type DropPlaceholderProps = {
  status: JobStatus;
  targetId?: number;
  onDrop?: (id: number) => void;
};

export function useJobBoardColumnPresentation({
  status,
  columnJobs,
  onDrop,
  onJobDrop,
  onDragStart,
  setDropTarget,
  onKeyboardMove,
  onOpen,
}: JobBoardColumnProps) {
  const { t } = useTranslation();
  const columnRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!columnRef.current) {
      return;
    }
    return dropTargetForElements({
      element: columnRef.current,
      canDrop: ({ source }) => source.data.type === "job-application",
      getData: () => ({ status, index: columnJobs.length }),
      onDragEnter: () => setDropTarget({ status, index: columnJobs.length }),
      onDrop: ({ source, location, self }) => {
        if (location.current.dropTargets[0]?.element !== self.element) {
          return;
        }
        onDrop(Number(source.data.applicationId), status, columnJobs);
      },
    });
  }, [columnJobs, onDrop, setDropTarget, status]);
  const columnName = `${getStatusLabel(t, status)} applications`;
  const statusLabel = getStatusLabel(t, status);
  function dropBeforeJob(job: JobApplication) {
    return (id: number) => onJobDrop(id, status, job.id, columnJobs);
  }
  function enterDropTarget(index: number) {
    return () => setDropTarget({ status, index });
  }
  function openJob(job: JobApplication) {
    return () => onOpen(job.id);
  }
  function moveJob(job: JobApplication) {
    return (direction: "up" | "down" | "first" | "last" | "previousStatus" | "nextStatus") =>
      onKeyboardMove(job.id, status, direction);
  }
  function startDraggingJob(job: JobApplication) {
    return () => onDragStart(job.id);
  }
  const dropHereLabel = t("applications.board.dropHere");
  return {
    columnRef,
    columnName,
    statusLabel,
    dropBeforeJob,
    enterDropTarget,
    openJob,
    moveJob,
    startDraggingJob,
    dropHereLabel,
  };
}
export function useDropTargetItemPresentation({
  status,
  index,
  targetId,
  jobs,
  onDrop,
  onDragEnter,
}: DropTargetItemProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!itemRef.current) {
      return;
    }
    return dropTargetForElements({
      element: itemRef.current,
      canDrop: ({ source }) => source.data.type === "job-application",
      getData: () => ({ status, index, targetId }),
      onDragEnter,
      onDrop: ({ source }) => onDrop(Number(source.data.applicationId), status, targetId, jobs),
    });
  }, [index, jobs, onDragEnter, onDrop, status, targetId]);

  return { itemRef };
}
export function useDropPlaceholderPresentation({ status, targetId, onDrop }: DropPlaceholderProps) {
  const placeholderRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!placeholderRef.current || targetId === undefined || !onDrop) {
      return;
    }
    return dropTargetForElements({
      element: placeholderRef.current,
      canDrop: ({ source }) => source.data.type === "job-application",
      getData: () => ({ status, targetId }),
      onDrop: ({ source }) => onDrop(Number(source.data.applicationId)),
    });
  }, [onDrop, status, targetId]);

  return { placeholderRef };
}
