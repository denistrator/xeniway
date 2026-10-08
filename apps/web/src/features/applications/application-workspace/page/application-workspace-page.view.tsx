import { LoadingScreen } from "../../../../components/loading-screen.view";
import { NotFoundPage } from "../../../../pages/not-found-page.view";
import { ApplicationWorkspaceContent } from "./application-workspace-content.view";
import { useApplicationWorkspacePage } from "./application-workspace-page.model";
import { applicationWorkspacePageStyles } from "./application-workspace-page.styles";

const styles = applicationWorkspacePageStyles();
export function ApplicationWorkspacePage() {
  const view = useApplicationWorkspacePage();

  if (view.notFound) {
    return <NotFoundPage />;
  }
  if (view.notDownloaded) {
    return (
      <p role="status" className={styles.offline()}>
        {view.offlineLabel}
      </p>
    );
  }
  if (view.detail.isPending) {
    return <LoadingScreen />;
  }
  if (view.failed || !view.detail.data) {
    return (
      <div role="alert" className={styles.error()}>
        <p className={styles.errorText()}>{view.errorText}</p>
        <button type="button" className={styles.retry()} onClick={view.retry}>
          {view.retryLabel}
        </button>
      </div>
    );
  }
  return <ApplicationWorkspaceContent key={view.detail.data.application.id} data={view.detail.data} />;
}
