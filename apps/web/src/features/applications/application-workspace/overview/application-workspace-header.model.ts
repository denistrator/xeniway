import type { JobApplication } from "@xeniway/shared";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../../i18n/format";
import { jobStatusStyles } from "../../board/job-status-styles";
import { getApplicationBoard } from "../shared/application-board";
import { sanitizeExternalUrl } from "../shared/sanitize-external-url";
import { applicationWorkspaceHeaderStyles } from "./application-workspace-header.styles";

import type { ApplicationFieldsController } from "./use-application-fields";

const styles = applicationWorkspaceHeaderStyles();

export type ApplicationWorkspaceHeaderProps = {
  application: JobApplication;
  fields: ApplicationFieldsController;
  actions: ReactNode;
};
export function useApplicationWorkspaceHeader({ application, fields, actions }: ApplicationWorkspaceHeaderProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "en";
  const board = getApplicationBoard(application);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const safeJobUrl = sanitizeExternalUrl(application.jobUrl);
  const compactFields = [
    {
      field: "position" as const,
      id: "application-position",
      label: t("applications.form.position"),
      type: "text" as const,
      maxLength: 255,
      required: true,
      showLabel: false,
      displayKind: "position" as const,
    },
    {
      field: "company" as const,
      id: "application-company",
      label: t("applications.form.company"),
      type: "text" as const,
      maxLength: 255,
      required: true,
      showLabel: false,
      displayKind: "company" as const,
    },
    {
      field: "location" as const,
      id: "application-location",
      label: t("applications.workspace.location"),
      type: "text" as const,
      maxLength: 500,
      required: false,
      showLabel: true,
      displayKind: "value" as const,
      displayValue: null,
    },
    {
      field: "salary" as const,
      id: "application-salary",
      label: t("applications.workspace.salary"),
      type: "text" as const,
      maxLength: 500,
      required: false,
      showLabel: true,
      displayKind: "value" as const,
      displayValue: null,
    },
    {
      field: "appliedAt" as const,
      id: "application-applied-at",
      label: t("applications.workspace.appliedAt"),
      type: "date" as const,
      maxLength: 10,
      required: false,
      showLabel: true,
      displayKind: "value" as const,
      displayValue: application.appliedAt ? formatDate(application.appliedAt, locale) : null,
    },
    {
      field: "jobUrl" as const,
      id: "application-job-url",
      label: t("applications.workspace.jobUrl"),
      type: "url" as const,
      maxLength: 500,
      required: false,
      showLabel: true,
      displayKind: "jobUrl" as const,
      displayValue: safeJobUrl,
    },
  ];
  const preparedCompactFields = compactFields.map((field) => ({
    ...field,
    hasDisplayValue: field.displayKind === "position" || field.displayKind === "company" || Boolean(field.displayValue),
  }));
  const headingFields = preparedCompactFields.slice(0, 2);
  const metadataFields = preparedCompactFields.slice(2);
  useEffect(() => headingRef.current?.focus(), []);
  const backTo = board === "active" ? "/" : `/${board}`;
  const backLabel = t("applications.workspace.backTo", {
    board: board === "active" ? t("navigation.applications") : t(`navigation.${board}`),
  });
  const slotClasses = {
    heading: styles.heading({ className: jobStatusStyles({ status: application.status }).workspaceHeading() }),
  };

  return {
    fields,
    application,
    headingRef,
    safeJobUrl,
    backTo,
    backLabel,
    slotClasses,
    headingFields,
    actions,
    metadataFields,
  };
}
export type WorkspaceHeaderField =
  | ReturnType<typeof useApplicationWorkspaceHeader>["headingFields"][number]
  | ReturnType<typeof useApplicationWorkspaceHeader>["metadataFields"][number];
