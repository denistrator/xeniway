import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { JobApplication } from "@xeniway/shared";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../i18n/format.ts";
import { useCanMutate } from "../../offline/offline-access.tsx";
import { getStatusLabel } from "./job-status.ts";

export type JobCardProps = {
  job: JobApplication;
  onOpen: () => void;
  onDragStart: () => void;
  onKeyboardMove: (direction: "up" | "down" | "first" | "last" | "previousStatus" | "nextStatus") => void;
  position: number;
  total: number;
};

export function useJobCardPresentation({ job, onDragStart, onKeyboardMove, position, total }: JobCardProps) {
  const { i18n, t } = useTranslation();
  const canMutate = useCanMutate();
  const cardRef = useRef<HTMLButtonElement>(null);
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
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
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
  return { canMutate, cardRef, handleKeyDown, accessibleName, appliedLabel };
}
