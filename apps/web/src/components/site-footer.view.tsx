import { useSiteFooter } from "./site-footer.model";
import { siteFooterStyles } from "./site-footer.styles";

const styles = siteFooterStyles();

export function SiteFooter() {
  const view = useSiteFooter();

  return (
    <footer className={styles.root()}>
      <p className={styles.description()}>{view.description}</p>
    </footer>
  );
}
