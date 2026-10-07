import type { JobApplication } from "@xeniway/shared";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { formatDate } from "../../../../i18n/format";
import { jobStatusStyles } from "../../board/job-status-styles";
import { getApplicationBoard } from "../shared/application-board";
import { sanitizeExternalUrl } from "../shared/sanitize-external-url";
import { ApplicationCompactField } from "./application-compact-field";
import { ApplicationStatusControl } from "./application-status-control";
import { ApplicationWorkspaceNavigation } from "./application-workspace-navigation";
import type { ApplicationFieldsController } from "./use-application-fields";

export function ApplicationWorkspaceHeader({
  application,
  fields,
  actions,
}: {
  application: JobApplication;
  fields: ApplicationFieldsController;
  actions: ReactNode;
}) {
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
      displayValue: <p className="text-sm font-semibold uppercase tracking-wide text-muted">{application.position}</p>,
    },
    {
      field: "company" as const,
      id: "application-company",
      label: t("applications.form.company"),
      type: "text" as const,
      maxLength: 255,
      required: true,
      showLabel: false,
      displayValue: (
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="break-words font-display text-3xl font-bold tracking-tight text-ink focus-visible:outline-2"
        >
          {application.company}
        </h1>
      ),
    },
    {
      field: "location" as const,
      id: "application-location",
      label: t("applications.workspace.location"),
      type: "text" as const,
      maxLength: 500,
      required: false,
      showLabel: true,
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
      displayValue: safeJobUrl ? (
        <a className="text-accent underline" href={safeJobUrl} target="_blank" rel="noopener noreferrer">
          {safeJobUrl}
        </a>
      ) : null,
    },
  ];
  const headingFields = compactFields.slice(0, 2);
  const metadataFields = compactFields.slice(2);

  useEffect(() => headingRef.current?.focus(), []);

  return (
    <header className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          className="inline-flex rounded-lg text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2"
          to={board === "active" ? "/" : `/${board}`}
        >
          {t("applications.workspace.backTo", {
            board: board === "active" ? t("navigation.applications") : t(`navigation.${board}`),
          })}
        </Link>
        <ApplicationWorkspaceNavigation application={application} />
      </div>
      <div className="grid items-end gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className={jobStatusStyles({ status: application.status }).workspaceHeading()}>
          {headingFields.map((field) => (
            <ApplicationCompactField key={field.field} fields={fields} {...field} />
          ))}
          <ApplicationStatusControl application={application} fields={fields} />
        </div>
        <div className="grid gap-2 lg:justify-items-end lg:self-center">{actions}</div>
      </div>
      <div className="workspace-metadata grid gap-4 rounded-2xl border border-line bg-surface p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {metadataFields.map((field) => (
          <ApplicationCompactField key={field.field} fields={fields} {...field} />
        ))}
      </div>
    </header>
  );
}
