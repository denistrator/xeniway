import type { JobApplication } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { formatDate } from "../../../i18n/format";

export function ArchiveApplicationCard({
  job,
  onRestore,
  onDelete,
  busy,
}: {
  job: JobApplication;
  onRestore: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { i18n, t } = useTranslation();
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="min-w-0">
          <h2 className="break-words font-semibold text-ink">{job.company}</h2>
          <p className="break-words text-sm leading-6 text-muted">{job.position}</p>
          {job.location && <p className="mt-1 break-words text-sm leading-6 text-muted">{job.location}</p>}
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("applications.archive.archived", {
              date: job.archivedAt ? formatDate(job.archivedAt, i18n.resolvedLanguage ?? "en") : "—",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" size="sm" onClick={onRestore} disabled={busy}>
            {t("applications.archive.restore")}
          </Button>
          <Button className="flex-1" variant="outline" size="sm" onClick={onDelete} disabled={busy}>
            {t("applications.archive.delete")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
