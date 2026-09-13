import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { matchesApplicationSearch } from "../../../lib/application-filters";
import { useApplicationMutations, useBlacklistedApplications } from "../../../lib/queries";
import type { RootState } from "../../../store";
import { ApplicationCollection } from "../application-collection";
import { BlacklistApplicationCard } from "./blacklist-application-card";

export function BlacklistPage() {
  const { t } = useTranslation();
  const blacklisted = useBlacklistedApplications();
  const mutations = useApplicationMutations();
  const search = useSelector((state: RootState) => state.ui.search);
  const items = useMemo(
    () => blacklisted.data?.filter((job) => matchesApplicationSearch(job, search)) ?? [],
    [blacklisted.data, search],
  );
  const error = blacklisted.error || mutations.unblacklist.error;
  const errorMessage = error
    ? t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"))
    : undefined;
  return (
    <ApplicationCollection
      title={t("applications.blacklist.title")}
      description={t("applications.blacklist.description")}
      loadingMessage={t("applications.blacklist.loading")}
      emptyMessage={t("applications.blacklist.empty")}
      noMatchMessage={t("applications.blacklist.noMatch")}
      errorMessage={errorMessage}
      loading={blacklisted.isPending}
      isEmpty={Boolean(blacklisted.data && !blacklisted.data.length)}
      hasResults={items.length > 0}
    >
      {items.map((job) => (
        <BlacklistApplicationCard
          key={job.id}
          job={job}
          busy={mutations.unblacklist.isPending}
          onRestore={() => mutations.unblacklist.mutateAsync(job.id)}
        />
      ))}
    </ApplicationCollection>
  );
}
