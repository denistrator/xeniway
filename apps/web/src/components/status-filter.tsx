import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState, setAllStatuses, toggleStatus } from "../store";
import { jobStatuses, statusLabels } from "./job-status";
import { Button } from "./ui/button";

export function StatusFilter() {
  const dispatch = useDispatch();
  const visibleStatuses = useSelector((state: RootState) => state.ui.visibleStatuses);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allSelected = visibleStatuses.length === jobStatuses.length;
  const partiallySelected = visibleStatuses.length > 0 && !allSelected;

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

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <Button
        ref={triggerRef}
        variant="outline"
        className="w-full sm:w-auto"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="status-filter-options"
        onClick={() => setOpen((current) => !current)}
      >
        Filter statuses
        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
          {allSelected ? "All" : `${visibleStatuses.length}/${jobStatuses.length}`}
        </span>
      </Button>
      {open && (
        <fieldset
          id="status-filter-options"
          className="absolute left-0 top-full z-20 mt-2 w-full min-w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:w-64"
        >
          <legend className="sr-only">Filter statuses</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={(event) => dispatch(setAllStatuses(event.target.checked))}
            />
            Select all statuses
          </label>
          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
          {jobStatuses.map((status) => (
            <label
              key={status}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={visibleStatuses.includes(status)}
                onChange={() => dispatch(toggleStatus(status))}
              />
              {statusLabels[status]}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
