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

export function getKeyboardMove(
  key: string,
  withShift: boolean,
  direction: "ltr" | "rtl",
): Parameters<JobCardProps["onKeyboardMove"]>[0] | null {
  if (withShift) {
    switch (key) {
      case "ArrowLeft": {
        return direction === "rtl" ? "nextStatus" : "previousStatus";
      }
      case "ArrowRight": {
        return direction === "rtl" ? "previousStatus" : "nextStatus";
      }
      default: {
        return null;
      }
    }
  }

  switch (key) {
    case "ArrowUp": {
      return "up";
    }
    case "ArrowDown": {
      return "down";
    }
    case "Home": {
      return "first";
    }
    case "End": {
      return "last";
    }
    default: {
      return null;
    }
  }
}

export function useJobCardPresentation({ job, onOpen, onDragStart, onKeyboardMove }: JobCardProps) {
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
    const move = getKeyboardMove(event.key, event.shiftKey, i18n.dir() === "rtl" ? "rtl" : "ltr");
    if (!move) {
      return;
    }
    event.preventDefault();
    onKeyboardMove(move);
  }
  const accessibleName = t("applications.board.cardLabel", {
    company: job.company,
    position: job.position,
    status: getStatusLabel(t, job.status),
  });
  const keyboardHelp = canMutate ? t("applications.board.keyboardInstructions") : null;
  const descriptionId = keyboardHelp ? `job-card-${job.id}-help` : undefined;
  const appliedLabel = job.appliedAt
    ? t("applications.board.applied", { date: formatDate(job.appliedAt, i18n.resolvedLanguage ?? "en") })
    : null;
  const href = `/applications/${job.id}`;
  return {
    canMutate,
    cardRef,
    handleClick,
    handleKeyDown,
    accessibleName,
    keyboardHelp,
    descriptionId,
    appliedLabel,
    href,
  };
}
