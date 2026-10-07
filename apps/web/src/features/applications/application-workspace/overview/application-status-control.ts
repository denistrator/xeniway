import type { JobApplication } from "@xeniway/shared";
import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCanMutate } from "../../../offline/offline-access.tsx";
import { getStatusLabel, jobStatuses } from "../../board/job-status.ts";
import { jobStatusStyles } from "../../board/job-status-styles.ts";
import { applicationStatusControlStyles, optionMarkerStyles } from "./application-status-control.styles.ts";
import type { ApplicationFieldsController } from "./use-application-fields.ts";

const styles = applicationStatusControlStyles();

export type ApplicationStatusControlProps = {
  application: JobApplication;
  fields: ApplicationFieldsController;
};
export function useApplicationStatusControl({ application, fields }: ApplicationStatusControlProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
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
      if (triggerRef.current?.disabled) {
        menuRef.current?.focus();
      } else {
        triggerRef.current?.focus();
      }
      wasOpen.current = false;
    }
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      closeMenu();
      if (triggerRef.current?.disabled) {
        menuRef.current?.focus();
      } else {
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);
  const triggerLabel = `${t("applications.form.status")}, ${t("applications.workspace.changeStatus")}`;
  const statusLabel = getStatusLabel(t, application.status);
  const slotClasses = {
    marker: styles.marker({ className: jobStatusStyles({ status: application.status }).marker() }),
  };
  const options = jobStatuses.map((option) => ({
    option,
    label: getStatusLabel(t, option),
    selected: option === application.status,
    markerClassName: styles.optionMarker({
      className: jobStatusStyles({ status: option }).marker({
        className: optionMarkerStyles({ selected: option === application.status }),
      }),
    }),
    onChange() {
      if (canMutate) {
        void fields.compact.selectStatus(option);
      }
    },
  }));
  function toggleStatus() {
    if (isOpen) {
      fields.compact.cancel("status");
    } else {
      fields.compact.requestEdit("status");
    }
  }
  const legendLabel = t("applications.form.status");
  return {
    menuRef,
    triggerRef,
    triggerLabel,
    isOpen,
    canMutate,
    fields,
    toggleStatus,
    slotClasses,
    statusLabel,
    legendLabel,
    options,
    selectedOptionRef,
  };
}
