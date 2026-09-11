import type { CreateApplicationInput } from "@job-tracker/shared";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { getApiErrorKey } from "../../i18n/format";
import { ApiRequestError } from "../../lib/api";
import { useApplicationMutations, useApplications, useCurrentUser } from "../../lib/queries";
import { closeDrawer, type RootState } from "../../store";
import { JobManager } from "./job-manager";

export function JobManagerHost() {
  const user = useCurrentUser();

  return user.data ? <AuthenticatedJobManager /> : null;
}

function AuthenticatedJobManager() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  const applications = useApplications();
  const mutations = useApplicationMutations();
  const selectedJob = applications.data?.find((job) => job.id === drawer.jobId);
  const pending = mutations.create.isPending || mutations.update.isPending;
  const mutationError =
    mutations.create.error || mutations.update.error || mutations.archive.error || mutations.blacklist.error;
  const mutationErrorCode = mutationError instanceof ApiRequestError ? mutationError.code : "REQUEST_FAILED";

  async function handleSave(input: CreateApplicationInput) {
    if (drawer.mode === "create") await mutations.create.mutateAsync(input);
    else if (drawer.jobId !== null) await mutations.update.mutateAsync({ id: drawer.jobId, input });
    dispatch(closeDrawer());
  }

  async function handleArchive() {
    if (drawer.jobId !== null) {
      await mutations.archive.mutateAsync(drawer.jobId);
      dispatch(closeDrawer());
    }
  }

  async function handleBlacklist(reason: string) {
    if (drawer.jobId !== null) {
      await mutations.blacklist.mutateAsync({ id: drawer.jobId, input: { reason: reason.trim() || null } });
      dispatch(closeDrawer());
    }
  }

  return (
    <>
      <JobManager
        job={selectedJob}
        submitting={pending}
        onSave={handleSave}
        onArchive={handleArchive}
        onBlacklist={handleBlacklist}
        blacklisting={mutations.blacklist.isPending}
        onClose={() => dispatch(closeDrawer())}
      />
      {mutationError && (
        <p className="mx-auto max-w-7xl px-6 pb-6 text-sm leading-6 text-rose-600 dark:text-rose-400">
          {t(getApiErrorKey(mutationErrorCode))}
        </p>
      )}
    </>
  );
}
