import { ApplicationSearch } from "../components/application-search.view";
import { PageIntro } from "../components/page-intro.view";
import { Button } from "../components/ui/button.view";
import { ConfirmationModal } from "../components/ui/confirmation-modal.view";
import { JobBoard } from "../features/applications/board/job-board.view";
import { StatusFilter } from "../features/applications/filters/status-filter.view";
import { useHomePage } from "./home-page.model";
import { homePageStyles } from "./home-page.styles";

const styles = homePageStyles();

export function HomePage() {
  const view = useHomePage();
  return (
    <div className={styles.root()}>
      <div className={styles.content()}>
        <div className={styles.intro()}>
          <PageIntro title={view.applicationsTitle} description={view.homeDescription} />
        </div>
        <div className={styles.filters()}>
          <ApplicationSearch />
          <button
            disabled={!view.canMutate}
            type="button"
            className={styles.removeAllButton()}
            onClick={view.openRemoveAll}
          >
            {view.removeAll}
          </button>
          <StatusFilter />
        </div>
        {view.applications.isPending && (
          <p role="status" aria-live="polite" className={styles.loading()}>
            {view.loading}
          </p>
        )}
        {view.applications.error && (
          <div role="alert" className={styles.error()}>
            <p>{view.errorMessage}</p>
            <div className={styles.errorActions()}>
              <Button variant="outline" size="sm" onClick={view.retryApplications}>
                {view.retry}
              </Button>
            </div>
          </div>
        )}
        {view.applications.data && !view.applications.data.length && <p className={styles.empty()}>{view.empty}</p>}
      </div>
      {view.applications.data && view.applications.data.length > 0 && (
        <JobBoard
          jobs={view.applications.data}
          onStatusChange={view.handleStatusChange}
          onReorder={view.handleReorder}
          operationError={view.boardOperationError ?? undefined}
        />
      )}
      {view.removeAllOpen && (
        <ConfirmationModal
          title={view.title}
          text={view.deleteAllConfirmation}
          yesLabel={view.yes}
          noLabel={view.no}
          onYes={view.confirmRemoveAll}
          onNo={view.closeRemoveAll}
        />
      )}
      {view.dangerOpen && (
        <ConfirmationModal
          title={view.dangerTitle}
          text={view.dangerConfirmation}
          yesLabel={view.dangerYesLabel}
          noLabel={view.no}
          yesDisabled={view.countdown > 0}
          onYes={view.handleRemoveAll}
          onNo={view.closeDanger}
        />
      )}
    </div>
  );
}
