import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { type RootState, setAllStatuses, toggleStatus } from "../store";
import { getStatusLabel, jobStatuses } from "./job/job-status";
import { Button } from "./ui/button";

export function StatusFilter() {
  const { t } = useTranslation();
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
        {t("applications.filterStatuses")}
        <span className="ml-2 text-xs text-muted">
          {allSelected ? t("applications.allStatuses") : `${visibleStatuses.length}/${jobStatuses.length}`}
        </span>
      </Button>
      {open && (
        <fieldset
          id="status-filter-options"
          className="absolute left-0 top-full z-20 mt-2 w-full min-w-56 rounded-xl border border-line bg-surface p-2 shadow-lg sm:w-64"
        >
          <legend className="sr-only">{t("applications.filterStatuses")}</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-hover">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={(event) => dispatch(setAllStatuses(event.target.checked))}
            />
            {t("applications.selectAllStatuses")}
          </label>
          <div className="my-1 border-t border-line" />
          {jobStatuses.map((status) => (
            <label
              key={status}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent-hover"
            >
              <input
                type="checkbox"
                checked={visibleStatuses.includes(status)}
                onChange={() => dispatch(toggleStatus(status))}
              />
              {getStatusLabel(t, status)}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
