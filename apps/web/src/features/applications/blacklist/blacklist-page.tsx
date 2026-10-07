import { ConfirmationModal } from "../../../components/ui/confirmation-modal.tsx";
import { ApplicationCollection } from "../collection/application-collection.tsx";
import { ApplicationCollectionCard } from "../collection/application-collection-card.tsx";
import { blacklistPageStyles } from "./blacklist-page.styles.ts";
import { useBlacklistPagePresentation } from "./blacklist-page.ts";

const styles = blacklistPageStyles();

export function BlacklistPage() {
  const {
    blacklistedDateLabel,
    blacklisted,
    isEmpty,
    busy,
    items,
    pendingRemoval,
    removeAllOpen,
    remove,
    errorMessage,
    title,
    description,
    loadingMessage,
    emptyMessage,
    noMatchMessage,
    removeAllLabel,
    openRemoveAll,
    restoreLabel,
    deleteLabel,
    restoreJob,
    requestRemoval,
    confirmationTitle,
    deleteConfirmation,
    yesLabel,
    noLabel,
    cancelRemoval,
    removeAllTitle,
    removeAllConfirmation,
    removeAllYesLabel,
    removeAllNoLabel,
    removeAll,
    cancelRemoveAll,
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
        removeAllLabel={removeAllLabel}
        onRemoveAll={openRemoveAll}
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
      {removeAllOpen && (
        <ConfirmationModal
          title={removeAllTitle}
          text={removeAllConfirmation}
          yesLabel={removeAllYesLabel}
          noLabel={removeAllNoLabel}
          onYes={removeAll}
          onNo={cancelRemoveAll}
        />
      )}
    </>
  );
}
