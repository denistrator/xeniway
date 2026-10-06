import type { CreateApplicationInput } from "@xeniway/shared";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { useApplicationMutations, useCurrentUser } from "../../../lib/queries";
import { closeDrawer, type RootState } from "../../../store";
import { JobManager } from "./job-manager";

type JobManagerHostProps = { openerRef?: RefObject<HTMLElement | null> };

export function JobManagerHost({ openerRef }: JobManagerHostProps) {
  const user = useCurrentUser();

  return user.data ? <AuthenticatedJobManager openerRef={openerRef} /> : null;
}

function AuthenticatedJobManager({ openerRef }: JobManagerHostProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isOpen = useSelector((state: RootState) => state.ui.drawer.open);
  const mutations = useApplicationMutations();
  const pending = mutations.create.isPending;
  const mutationError = mutations.create.error;
  const mutationErrorCode = mutationError instanceof ApiRequestError ? mutationError.code : "REQUEST_FAILED";

  async function handleSave(input: CreateApplicationInput) {
    await mutations.create.mutateAsync(input);
    dispatch(closeDrawer());
  }

  return (
    <>
      <JobManager
        open={isOpen}
        submitting={pending}
        onSave={handleSave}
        onClose={() => dispatch(closeDrawer())}
        openerRef={openerRef}
      />
      {mutationError && (
        <p className="mx-auto max-w-7xl px-6 pb-6 text-sm leading-6 text-rose-600 dark:text-rose-400">
          {t(getApiErrorKey(mutationErrorCode))}
        </p>
      )}
    </>
  );
}
