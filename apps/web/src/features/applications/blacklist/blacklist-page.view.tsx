import { ConfirmationModal } from "../../../components/ui/confirmation-modal.view";
import { ApplicationBulkDelete } from "../collection/application-bulk-delete.view";
import { ApplicationCollection } from "../collection/application-collection.view";
import { ApplicationCollectionCard } from "../collection/application-collection-card.view";
import { useBlacklistPagePresentation } from "./blacklist-page.model";
import { blacklistPageStyles } from "./blacklist-page.styles";

const styles = blacklistPageStyles();

export function BlacklistPage() {
  const {
    blacklistedDateLabel,
    blacklisted,
    isEmpty,
    busy,
    items,
    pendingRemoval,
    applicationCount,
    deleteApplications,
    remove,
    errorMessage,
    title,
    description,
    loadingMessage,
    emptyMessage,
    noMatchMessage,
    restoreLabel,
    deleteLabel,
    restoreJob,
    requestRemoval,
    confirmationTitle,
    deleteConfirmation,
    yesLabel,
    noLabel,
    cancelRemoval,
  } = useBlacklistPagePresentation();

  return (
    <>
      <ApplicationCollection
        title={title}
        description={description}
        loadingMessage={loadingMessage}
        emptyMessage={emptyMessage}
        noMatchMessage={noMatchMessage}
        errorMessage={errorMessage}
        loading={blacklisted.isPending}
        isEmpty={isEmpty}
        hasResults={items.length > 0}
        actions={
          <ApplicationBulkDelete board="blacklist" count={applicationCount} deleteApplications={deleteApplications} />
        }
      >
        {items.map((job) => (
          <ApplicationCollectionCard
            key={job.id}
            job={job}
            details={
              <>
                {job.blacklistReason && <p className={styles.reason()}>{job.blacklistReason}</p>}
                <p className={styles.blacklistedDate()}>{blacklistedDateLabel(job)}</p>
              </>
            }
            restoreLabel={restoreLabel}
            deleteLabel={deleteLabel}
            onRestore={restoreJob(job)}
            onDelete={requestRemoval(job)}
            busy={busy}
          />
        ))}
      </ApplicationCollection>
      {pendingRemoval && (
        <ConfirmationModal
          title={confirmationTitle}
          text={deleteConfirmation}
          yesLabel={yesLabel}
          noLabel={noLabel}
          onYes={remove}
          onNo={cancelRemoval}
        />
      )}
    </>
  );
}
