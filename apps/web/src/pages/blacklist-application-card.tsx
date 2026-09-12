import type { JobApplication } from "@xeniway/shared";
import { useTranslation } from "react-i18next";
import { getStatusLabel } from "../components/job/job-status";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { formatDate } from "../i18n/format";

export function BlacklistApplicationCard({
  job,
  onRestore,
  busy,
}: {
  job: JobApplication;
  onRestore: () => void;
  busy: boolean;
}) {
  const { i18n, t } = useTranslation();
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="min-w-0">
          <h2 className="break-words font-semibold text-ink">{job.company}</h2>
          <p className="break-words text-sm leading-6 text-muted">{job.position}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("applications.blacklist.status", { status: getStatusLabel(t, job.status) })}
          </p>
          {job.blacklistReason && (
            <p className="mt-3 break-words rounded-lg bg-surface-tint p-3 text-sm leading-6 text-ink">
              {job.blacklistReason}
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("applications.blacklist.blacklisted", {
              date: job.blacklistedAt ? formatDate(job.blacklistedAt, i18n.resolvedLanguage ?? "en") : "—",
            })}
          </p>
        </div>
        <Button className="w-full" size="sm" onClick={onRestore} disabled={busy}>
          {t("applications.blacklist.remove")}
        </Button>
      </CardContent>
    </Card>
  );
}
