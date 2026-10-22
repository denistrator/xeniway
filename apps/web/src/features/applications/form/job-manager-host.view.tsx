import { JobManager } from "./job-manager.view";
import {
  type JobManagerHostProps,
  useAuthenticatedJobManagerPresentation,
  useJobManagerHostPresentation,
} from "./job-manager-host.model";

export function JobManagerHost({ openerRef }: JobManagerHostProps) {
  const { user } = useJobManagerHostPresentation();

  return user.data ? <AuthenticatedJobManager openerRef={openerRef} /> : null;
}

function AuthenticatedJobManager({ openerRef }: JobManagerHostProps) {
  const { isOpen, pending, handleSave, close, submitError } = useAuthenticatedJobManagerPresentation();

  return (
    <JobManager
      open={isOpen}
      submitting={pending}
      submitError={submitError}
      onSave={handleSave}
      onClose={close}
      openerRef={openerRef}
    />
  );
}

export type { JobManagerHostProps } from "./job-manager-host.model";
