import { ApplicationSearch } from "../../../components/application-search.view";
import { PageIntro } from "../../../components/page-intro.view";
import type { ApplicationCollectionProps } from "./application-collection.model";
import { applicationCollectionStyles } from "./application-collection.styles";

const styles = applicationCollectionStyles();

export function ApplicationCollection({
  title,
  description,
  loadingMessage,
  emptyMessage,
  noMatchMessage,
  errorMessage,
  loading,
  isEmpty,
  hasResults,
  children,
  actions,
}: ApplicationCollectionProps) {
  return (
    <div className={styles.root()}>
      <PageIntro title={title} description={description} />
      <div className={styles.toolbar()}>
        <ApplicationSearch />
      </div>
      {loading && (
        <p role="status" aria-live="polite" className={styles.loading()}>
          {loadingMessage}
        </p>
      )}
      {errorMessage && (
        <p role="alert" className={styles.error()}>
          {errorMessage}
        </p>
      )}
      {isEmpty && <p className={styles.empty()}>{emptyMessage}</p>}
      {hasResults && <div className={styles.results()}>{children}</div>}
      {!loading && !isEmpty && !hasResults && <p className={styles.noMatch()}>{noMatchMessage}</p>}
      {actions}
    </div>
  );
}
