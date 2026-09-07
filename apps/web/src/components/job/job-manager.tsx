import type { CreateApplicationInput, JobApplication } from "@job-tracker/shared";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { jobFormPresentationStorageKey, type RootState, setJobFormPresentation } from "../../store";
import { JobDrawer } from "./job-drawer";
import { JobModal } from "./job-modal";

export function JobManager({
  job,
  submitting,
  onSave,
  onArchive,
  onBlacklist,
  blacklisting,
  onClose,
}: {
  job?: JobApplication;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onArchive: () => void;
  onBlacklist: (reason: string) => void;
  blacklisting: boolean;
  onClose: () => void;
}) {
  const dispatch = useDispatch();
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  const presentation = useSelector((state: RootState) => state.ui.jobFormPresentation);
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(jobFormPresentationStorageKey, presentation);
  }, [presentation]);

  useLayoutEffect(() => {
    if (drawer.open && !wasOpenRef.current) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const initialFocus = dialogRef.current?.querySelector<HTMLElement>("[data-dialog-initial-focus]");
      (initialFocus ?? dialogRef.current)?.focus();
    } else if (!drawer.open && wasOpenRef.current) {
      openerRef.current?.focus();
      openerRef.current = null;
    }
    wasOpenRef.current = drawer.open;
  }, [drawer.open]);

  useEffect(() => {
    if (!drawer.open) return;
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [drawer.open, onClose]);

  if (!drawer.open) return null;

  const switchPresentation = () => {
    dispatch(setJobFormPresentation(presentation === "drawer" ? "modal" : "drawer"));
  };

  const wrapperProps = {
    mode: drawer.mode,
    presentation,
    dialogRef,
    job,
    submitting,
    onSave,
    onArchive,
    onBlacklist,
    blacklisting,
    onClose,
    onSwitchPresentation: switchPresentation,
  };

  return presentation === "modal" ? <JobModal {...wrapperProps} /> : <JobDrawer {...wrapperProps} />;
}
