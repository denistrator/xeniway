import type { JobApplication } from "@xeniway/shared";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../components/ui/card";
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
          {details}
        </div>
        <ApplicationCollectionActions
          restoreLabel={restoreLabel}
          deleteLabel={deleteLabel}
          onRestore={onRestore}
          onDelete={onDelete}
          busy={busy}
        />
      </CardContent>
    </Card>
  );
}
