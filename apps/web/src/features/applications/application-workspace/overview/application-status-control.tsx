import type { JobApplication } from "@xeniway/shared";
import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import { tv } from "tailwind-variants";
import { getStatusLabel, jobStatuses } from "../../board/job-status";
import { jobStatusStyles } from "../../board/job-status-styles";
import type { ApplicationFieldsController } from "./use-application-fields";

const optionMarkerStyles = tv({
  base: "pointer-events-none size-4 rounded-full border-3",
  variants: { selected: { true: "border-accent", false: "border-transparent" } },
});

export function ApplicationStatusControl({
  application,
  fields,
}: {
  application: JobApplication;
  fields: ApplicationFieldsController;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOptionRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const isOpen = fields.compact.activeField === "status";
  const closeMenu = useEffectEvent(() => fields.compact.blur("status"));

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      selectedOptionRef.current?.focus();
    } else if (wasOpen.current) {
      triggerRef.current?.focus();
      wasOpen.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) closeMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeMenu();
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} data-compact-edit-field="status" className="workspace-inline-edit relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${t("applications.form.status")}, ${t("applications.workspace.changeStatus")}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="application-status-options"
        disabled={fields.fields.status.pending}
        onClick={() => {
          if (isOpen) fields.compact.cancel("status");
          else fields.compact.requestEdit("status");
        }}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-ink hover:bg-surface-hover focus-visible:outline-2"
      >
        <span
          aria-hidden="true"
          className={jobStatusStyles({ status: application.status }).marker({ className: "size-2 rounded-full" })}
        />
        {getStatusLabel(t, application.status)}
      </button>
      {isOpen && (
        <fieldset
          id="application-status-options"
          className="absolute start-0 top-full z-20 mt-2 min-w-56 rounded-xl border border-line bg-surface p-2 shadow-lg"
        >
          <legend className="sr-only">{t("applications.form.status")}</legend>
          {jobStatuses.map((option) => (
            <label
              key={option}
              className="relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent-hover has-[:focus-visible]:outline-2"
            >
              <input
                ref={option === application.status ? selectedOptionRef : undefined}
                type="radio"
                name="application-status"
                value={option}
                checked={option === application.status}
                disabled={fields.fields.status.pending}
                onChange={() => fields.compact.selectStatus(option)}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              <span
                aria-hidden="true"
                className={jobStatusStyles({ status: option }).marker({
                  className: optionMarkerStyles({ selected: option === application.status }),
                })}
              />
              {getStatusLabel(t, option)}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
