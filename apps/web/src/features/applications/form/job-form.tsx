import type { CreateApplicationInput, JobApplication } from "@xeniway/shared";
import { JobFormActions } from "./job-form-actions";
import { JobFormBasicFields } from "./job-form-basic-fields";
import { JobFormBlacklist } from "./job-form-blacklist";
import { JobFormDetailsFields } from "./job-form-details-fields";
import { useJobForm } from "./use-job-form";

export function JobForm({
  job,
  submitting,
  onSubmit,
  onArchive,
  onBlacklist,
  blacklisting = false,
}: {
  job?: JobApplication | null;
  submitting: boolean;
  onSubmit: (input: CreateApplicationInput) => void;
  onArchive?: () => void;
  onBlacklist?: (reason: string) => void;
  blacklisting?: boolean;
}) {
  const form = useJobForm({ job, onSubmit });

  return (
    <form
      className="flex grow flex-col space-y-4"
      onSubmit={form.handleSubmit}
      aria-describedby={form.error ? "application-form-error" : undefined}
      autoComplete="off"
    >
      <JobFormBasicFields form={form.form} update={form.update} />
      <JobFormDetailsFields form={form.form} update={form.update} />
      {job && onBlacklist && form.blacklistOpen && (
        <JobFormBlacklist
          reason={form.blacklistReason}
          blacklisting={blacklisting}
          onReasonChange={form.setBlacklistReason}
          onCancel={() => form.setBlacklistOpen(false)}
          onConfirm={() => onBlacklist(form.blacklistReason)}
        />
      )}
      {form.error && (
        <p
          ref={form.errorRef}
          id="application-form-error"
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="text-sm text-rose-600 dark:text-rose-400"
        >
          {form.error}
        </p>
      )}
      <JobFormActions
        submitting={submitting}
        hasJob={Boolean(job && onBlacklist)}
        blacklistOpen={form.blacklistOpen}
        onOpenBlacklist={() => form.setBlacklistOpen(true)}
        onArchive={onArchive}
      />
    </form>
  );
}
