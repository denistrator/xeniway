import { pageIntroStyles } from "./page-intro.styles.ts";
import type { PageIntroProps } from "./page-intro.ts";

const styles = pageIntroStyles();

export function PageIntro({ title, description }: PageIntroProps) {
  return (
    <div className={styles.root()}>
      <h1 className={styles.heading()}>{title}</h1>
      <p className={styles.description()}>{description}</p>
    </div>
  );
}
