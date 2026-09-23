import type { JobApplication } from "@xeniway/shared";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { formatDate } from "../../../i18n/format";
import { getStatusLabel, statusStyles } from "../job-status";
import { safeProfileUrl } from "./contact-links";
import { getWorkspaceBoard } from "./workspace-board";
import { WorkspaceDetail } from "./workspace-detail";

export function ApplicationWorkspaceHeader({ application }: { application: JobApplication }) {
  const { i18n, t } = useTranslation();
  const board = getWorkspaceBoard(application);
  const jobUrl = safeProfileUrl(application.jobUrl);
  const heading = useRef<HTMLHeadingElement>(null);
  const backPath = board === "active" ? "/" : `/${board}`;
  const backLabel = board === "active" ? t("navigation.applications") : t(`navigation.${board}`);

  useEffect(() => heading.current?.focus(), []);

  return (
    <header className="space-y-5">
      <Link
        className="inline-flex rounded-lg text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2"
        to={backPath}
      >
        {t("applications.workspace.backTo", { board: backLabel })}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{application.position}</p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="mt-1 break-words font-display text-3xl font-bold tracking-tight text-ink focus-visible:outline-2"
          >
            {application.company}
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-ink">
          <span aria-hidden="true" className={`size-2 rounded-full ${statusStyles[application.status].marker}`} />
          {getStatusLabel(t, application.status)}
        </span>
      </div>
      <dl className="grid gap-4 rounded-2xl border border-line bg-surface p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <WorkspaceDetail label={t("applications.workspace.location")} value={application.location} />
        <WorkspaceDetail label={t("applications.workspace.salary")} value={application.salary} />
        <WorkspaceDetail
          label={t("applications.workspace.appliedAt")}
          value={application.appliedAt ? formatDate(application.appliedAt, i18n.resolvedLanguage ?? "en") : null}
        />
        <div>
          <dt className="font-medium text-muted">{t("applications.workspace.jobUrl")}</dt>
          <dd className="mt-1 break-all text-ink">
            {jobUrl ? (
              <a className="text-accent underline" href={jobUrl} target="_blank" rel="noopener noreferrer">
                {jobUrl}
              </a>
            ) : (
              t("applications.workspace.notProvided")
            )}
          </dd>
        </div>
      </dl>
      {application.description && (
        <p className="whitespace-pre-wrap rounded-2xl bg-surface-tint p-5 text-sm leading-6 text-ink">
          {application.description}
        </p>
      )}
      {application.notes && (
        <section aria-labelledby="application-notes-heading" className="rounded-2xl border border-line bg-surface p-5">
          <h2 id="application-notes-heading" className="font-display text-lg font-semibold text-ink">
            {t("applications.workspace.applicationNotes")}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{application.notes}</p>
        </section>
      )}
    </header>
  );
}
