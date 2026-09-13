import type { JobApplication } from "@xeniway/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { matchesApplicationSearch } from "../../../lib/application-filters";
import { useApplicationMutations, useArchivedApplications } from "../../../lib/queries";
import type { RootState } from "../../../store";
import { ApplicationCollection } from "../application-collection";
import { ArchiveApplicationCard } from "./archive-application-card";

export function ArchivePage() {
  const { t } = useTranslation();
  const archived = useArchivedApplications();
  const mutations = useApplicationMutations();
  const search = useSelector((state: RootState) => state.ui.search);
  const items = useMemo(
    () => archived.data?.filter((job) => matchesApplicationSearch(job, search)) ?? [],
    [archived.data, search],
  );
  async function restore(id: number) {
    await mutations.restore.mutateAsync(id);
  }
  async function remove(job: JobApplication) {
    if (window.confirm(t("applications.archive.deleteConfirmation", job))) await mutations.remove.mutateAsync(job.id);
  }
  const error = mutations.restore.error || mutations.remove.error || archived.error;
  const errorMessage = error
    ? t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"))
    : undefined;
  return (
    <ApplicationCollection
      title={t("applications.archive.title")}
      description={t("applications.archive.description")}
      loadingMessage={t("applications.archive.loading")}
      emptyMessage={t("applications.archive.empty")}
      noMatchMessage={t("applications.archive.noMatch")}
      errorMessage={errorMessage}
      loading={archived.isPending}
      isEmpty={Boolean(archived.data && !archived.data.length)}
      hasResults={items.length > 0}
    >
      {items.map((job) => (
        <ArchiveApplicationCard
          key={job.id}
          job={job}
          onRestore={() => restore(job.id)}
          onDelete={() => remove(job)}
          busy={mutations.restore.isPending || mutations.remove.isPending}
        />
      ))}
    </ApplicationCollection>
  );
}
