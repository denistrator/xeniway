import type { JobApplication } from "@xeniway/shared";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { ApplicationActivity } from "./activity/application-activity";
import { ApplicationCollectionActions } from "./application-collection-actions";
import { getStatusLabel } from "./job-status";

export function ApplicationCollectionCard({
  job,
  details,
  restoreLabel,
  deleteLabel,
  onRestore,
  onDelete,
  busy,
}: {
  job: JobApplication;
  details: ReactNode;
  restoreLabel: ReactNode;
  deleteLabel: ReactNode;
  onRestore: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="min-w-0">
          <h2 className="break-words font-semibold text-ink">{job.company}</h2>
          <p className="break-words text-sm leading-6 text-muted">{job.position}</p>
          {job.location && <p className="mt-1 break-words text-sm leading-6 text-muted">{job.location}</p>}
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("applications.blacklist.status", { status: getStatusLabel(t, job.status) })}
          </p>
          <Link
            className="mt-2 inline-flex rounded-lg text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2"
            to={`/applications/${job.id}`}
          >
            {t("applications.workspace.open")}
          </Link>
          {details}
        </div>
        <ApplicationCollectionActions
          restoreLabel={restoreLabel}
          deleteLabel={deleteLabel}
          onRestore={onRestore}
          onDelete={onDelete}
          busy={busy}
        />
        <button
          type="button"
          aria-expanded={activityOpen}
          aria-controls={`application-activity-${job.id}`}
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover focus-visible:outline-2"
          onClick={() => setActivityOpen((open) => !open)}
        >
          {t(activityOpen ? "applications.activity.hide" : "applications.activity.view")}
        </button>
        {activityOpen && (
          <div id={`application-activity-${job.id}`}>
            <ApplicationActivity applicationId={job.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
