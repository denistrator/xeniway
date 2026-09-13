import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState, setAllStatuses, toggleStatus } from "../../../store";
import { jobStatuses } from "../job-status";

export function useStatusFilter() {
  const dispatch = useDispatch();
  const visibleStatuses = useSelector((state: RootState) => state.ui.visibleStatuses);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allSelected = visibleStatuses.length === jobStatuses.length;
  const partiallySelected = visibleStatuses.length > 0 && !allSelected;
  const selectAll = useCallback((selected: boolean) => dispatch(setAllStatuses(selected)), [dispatch]);
  const toggle = useCallback(
    (status: RootState["ui"]["visibleStatuses"][number]) => dispatch(toggleStatus(status)),
    [dispatch],
  );

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return {
    containerRef,
    triggerRef,
    selectAllRef,
    visibleStatuses,
    open,
    setOpen,
    allSelected,
    selectAll,
    toggle,
  };
}
