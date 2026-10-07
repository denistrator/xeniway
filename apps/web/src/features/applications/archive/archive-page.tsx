import { ConfirmationModal } from "../../../components/ui/confirmation-modal.tsx";
import { ApplicationCollection } from "../collection/application-collection.tsx";
import { ApplicationCollectionCard } from "../collection/application-collection-card.tsx";
import { archivePageStyles } from "./archive-page.styles.ts";
import { useArchivePagePresentation } from "./archive-page.ts";

const styles = archivePageStyles();

export function ArchivePage() {
  const {
    archived,
    isEmpty,
    busy,
    items,
    pendingRemoval,
    removeAllOpen,
    remove,
    archivedDateLabel,
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
  } = useArchivePagePresentation();

  return (
    <>
      <ApplicationCollection
        title={title}
        description={description}
        loadingMessage={loadingMessage}
        emptyMessage={emptyMessage}
        noMatchMessage={noMatchMessage}
        errorMessage={errorMessage}
        loading={archived.isPending}
        isEmpty={isEmpty}
        hasResults={items.length > 0}
        removeAllLabel={removeAllLabel}
        onRemoveAll={openRemoveAll}
      >
        {items.map((job) => (
          <ApplicationCollectionCard
            key={job.id}
            job={job}
            details={<p className={styles.archivedDate()}>{archivedDateLabel(job)}</p>}
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
