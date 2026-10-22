import { ConfirmationModal } from "../../../components/ui/confirmation-modal.view";
import { ApplicationBulkDelete } from "../collection/application-bulk-delete.view";
import { ApplicationCollection } from "../collection/application-collection.view";
import { ApplicationCollectionCard } from "../collection/application-collection-card.view";
import { useArchivePagePresentation } from "./archive-page.model";
import { archivePageStyles } from "./archive-page.styles";

const styles = archivePageStyles();

export function ArchivePage() {
  const {
    archived,
    isEmpty,
    busy,
    items,
    pendingRemoval,
    applicationCount,
    deleteApplications,
    remove,
    archivedDateLabel,
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
        actions={
          <ApplicationBulkDelete board="archive" count={applicationCount} deleteApplications={deleteApplications} />
        }
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
    </>
  );
}
