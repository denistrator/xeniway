import type { PageIntroProps } from "./page-intro.model";
import { pageIntroStyles } from "./page-intro.styles";

const styles = pageIntroStyles();

export function PageIntro({ title, description }: PageIntroProps) {
  return (
    <div className={styles.root()}>
      <h1 className={styles.heading()}>{title}</h1>
      <p className={styles.description()}>{description}</p>
    </div>
  );
}
