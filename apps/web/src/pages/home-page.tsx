import type { JobStatus } from "@xeniway/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApplicationSearch } from "../components/application-search";
import { PageIntro } from "../components/page-intro";
import { ConfirmationModal } from "../components/ui/confirmation-modal";
import { StatusFilter } from "../features/applications/filters/status-filter";
import { JobBoard } from "../features/applications/job-board";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { useApplicationMutations, useApplications } from "../lib/queries";

export function HomePage() {
  const { t } = useTranslation();
  const applications = useApplications();
  const mutations = useApplicationMutations();
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  useEffect(() => {
    if (!dangerOpen) return;
    setCountdown(5);
    const timer = window.setInterval(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [dangerOpen]);
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
          <button
            type="button"
            className="h-10 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setRemoveAllOpen(true)}
          >
            {t("common.actions.removeAll")}
          </button>
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
      {removeAllOpen && (
        <ConfirmationModal
          title={t("applications.confirmation.title")}
          text={t("common.actions.deleteAllConfirmation")}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={() => {
            setRemoveAllOpen(false);
            setDangerOpen(true);
          }}
          onNo={() => setRemoveAllOpen(false)}
        />
      )}
      {dangerOpen && (
        <ConfirmationModal
          title={t("applications.confirmation.dangerTitle")}
          text={t("common.actions.dangerConfirmation")}
          yesLabel={countdown ? `${t("common.actions.yes")} (${countdown})` : t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          yesDisabled={countdown > 0}
          onYes={async () => {
            await mutations.removeAll.mutateAsync("active");
            setDangerOpen(false);
          }}
          onNo={() => setDangerOpen(false)}
        />
      )}
    </div>
  );
}
