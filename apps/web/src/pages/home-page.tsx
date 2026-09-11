import type { JobStatus } from "@job-tracker/shared";
import { useTranslation } from "react-i18next";
import { ApplicationSearch } from "../components/application-search";
import { JobBoard } from "../components/job/job-board";
import { PageIntro } from "../components/page-intro";
import { StatusFilter } from "../components/status-filter";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { useApplicationMutations, useApplications } from "../lib/queries";

export function HomePage() {
  const { t } = useTranslation();
  const applications = useApplications();
  const mutations = useApplicationMutations();
  async function handleStatusChange(id: number, status: JobStatus) {
    await mutations.update.mutateAsync({ id, input: { status } });
  }

  async function handleReorder(status: JobStatus, applicationIds: number[]) {
    await mutations.reorder.mutateAsync({ status, applicationIds });
  }

  const errorCode = applications.error instanceof ApiRequestError ? applications.error.code : "REQUEST_FAILED";

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6 px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageIntro title={t("navigation.applications")} description={t("applications.homeDescription")} />
        </div>
        <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <ApplicationSearch />
          <StatusFilter />
        </div>
        {applications.isPending && (
          <p role="status" aria-live="polite" className="py-8 text-center text-sm leading-6 text-muted">
            {t("applications.loading")}
          </p>
        )}
        {applications.error && (
          <p className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {t(getApiErrorKey(errorCode))}
          </p>
        )}
        {applications.data && !applications.data.length && (
          <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
            {t("applications.empty")}
          </p>
        )}
      </div>
      {applications.data && applications.data.length > 0 && (
        <JobBoard jobs={applications.data} onStatusChange={handleStatusChange} onReorder={handleReorder} />
      )}
    </div>
  );
}
