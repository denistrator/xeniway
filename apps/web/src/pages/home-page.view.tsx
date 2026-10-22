import { ApplicationSearch } from "../components/application-search.view";
import { PageIntro } from "../components/page-intro.view";
import { Button } from "../components/ui/button.view";
import { JobBoard } from "../features/applications/board/job-board.view";
import { ApplicationBulkDelete } from "../features/applications/collection/application-bulk-delete.view";
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
          <StatusFilter />
        </div>
        {view.applications.isPending && (
          <p role="status" aria-live="polite" className={styles.loading()}>
            {view.loading}
          </p>
        )}
        {view.applications.error && (
          <div role="alert" className={styles.error()}>
            <p className={styles.errorMessage()}>{view.errorMessage}</p>
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
          operationSuccess={view.boardOperationSuccess ?? undefined}
        />
      )}
      <div className={styles.boardActions()}>
        <ApplicationBulkDelete
          board="active"
          count={view.applicationCount}
          deleteApplications={view.deleteApplications}
        />
      </div>
    </div>
  );
}
