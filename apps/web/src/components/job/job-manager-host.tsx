import type { CreateApplicationInput } from "@job-tracker/shared";
import { useDispatch, useSelector } from "react-redux";
import { useApplicationMutations, useApplications, useCurrentUser } from "../../lib/queries";
import { closeDrawer, type RootState } from "../../store";
import { JobManager } from "./job-manager";

export function JobManagerHost() {
  const user = useCurrentUser();

  return user.data ? <AuthenticatedJobManager /> : null;
}

function AuthenticatedJobManager() {
  const dispatch = useDispatch();
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  const applications = useApplications();
  const mutations = useApplicationMutations();
  const selectedJob = applications.data?.find((job) => job.id === drawer.jobId);
  const pending = mutations.create.isPending || mutations.update.isPending;

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

  return (
    <>
      <JobManager
        job={selectedJob}
        submitting={pending}
        onSave={handleSave}
        onArchive={handleArchive}
        onClose={() => dispatch(closeDrawer())}
      />
      {(mutations.create.error || mutations.update.error || mutations.archive.error) && (
        <p className="mx-auto max-w-7xl px-6 pb-6 text-sm text-rose-600 dark:text-rose-400">
          {(mutations.create.error || mutations.update.error || mutations.archive.error)?.message}
        </p>
      )}
    </>
  );
}
