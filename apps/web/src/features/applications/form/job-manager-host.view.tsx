import { JobManager } from "./job-manager.view";
import {
  type JobManagerHostProps,
  useAuthenticatedJobManagerPresentation,
  useJobManagerHostPresentation,
} from "./job-manager-host.model";
import { jobManagerHostStyles } from "./job-manager-host.styles";

const styles = jobManagerHostStyles();

export function JobManagerHost({ openerRef }: JobManagerHostProps) {
  const { user } = useJobManagerHostPresentation();

  return user.data ? <AuthenticatedJobManager openerRef={openerRef} /> : null;
}

function AuthenticatedJobManager({ openerRef }: JobManagerHostProps) {
  const { isOpen, pending, mutationError, handleSave, close, selectionLabel } =
    useAuthenticatedJobManagerPresentation();

  return (
    <>
      <JobManager open={isOpen} submitting={pending} onSave={handleSave} onClose={close} openerRef={openerRef} />
      {mutationError && <p className={styles.error()}>{selectionLabel}</p>}
    </>
  );
}

export type { JobManagerHostProps } from "./job-manager-host.model";
