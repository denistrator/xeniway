import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { JobApplication } from "@xeniway/shared";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../i18n/format";
import { useCanMutate } from "../../offline/offline-access.view";
import { getStatusLabel } from "./job-status";

export type JobCardProps = {
  job: JobApplication;
  onOpen: () => void;
  onDragStart: () => void;
  onKeyboardMove: (direction: "up" | "down" | "first" | "last" | "previousStatus" | "nextStatus") => void;
  position: number;
  total: number;
};

export function useJobCardPresentation({ job, onOpen, onDragStart, onKeyboardMove, position, total }: JobCardProps) {
  const { i18n, t } = useTranslation();
  const canMutate = useCanMutate();
  const cardRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!cardRef.current || !canMutate) {
      return;
    }
    return draggable({
      element: cardRef.current,
      getInitialData: () => ({ type: "job-application", applicationId: job.id }),
      onDragStart,
    });
  }, [job.id, onDragStart, canMutate]);
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    const isModifiedClick = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
    if (isModifiedClick) {
      return;
    }
    event.preventDefault();
    onOpen();
  }
  function handleKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
    if (!canMutate) {
      return;
    }
    let direction: Parameters<typeof onKeyboardMove>[0] | null = null;
    if (event.shiftKey) {
      switch (event.key) {
        case "ArrowLeft":
          direction = "previousStatus";
          break;
        case "ArrowRight":
          direction = "nextStatus";
          break;
      }
    } else {
      switch (event.key) {
        case "ArrowUp":
          direction = "up";
          break;
        case "ArrowDown":
          direction = "down";
          break;
        case "Home":
          direction = "first";
          break;
        case "End":
          direction = "last";
          break;
      }
    }
    if (!direction) {
      return;
    }
    event.preventDefault();
    onKeyboardMove(direction);
  }
  const accessibleName = `${job.company}, ${job.position}, ${getStatusLabel(t, job.status)}. ${t("applications.board.openDetails")}. Position ${position} of ${total}. ${t("applications.board.keyboardInstructions")}`;
  const appliedLabel = job.appliedAt
    ? t("applications.board.applied", { date: formatDate(job.appliedAt, i18n.resolvedLanguage ?? "en") })
    : null;
  const href = `/applications/${job.id}`;
  return { canMutate, cardRef, handleClick, handleKeyDown, accessibleName, appliedLabel, href };
}
