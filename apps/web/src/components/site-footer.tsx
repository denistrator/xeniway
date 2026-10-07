import { siteFooterStyles } from "./site-footer.styles.ts";
import { useSiteFooter } from "./site-footer.ts";

const styles = siteFooterStyles();

export function SiteFooter() {
  const view = useSiteFooter();

  return (
    <footer className={styles.root()}>
      <p className={styles.description()}>{view.description}</p>
    </footer>
  );
}
