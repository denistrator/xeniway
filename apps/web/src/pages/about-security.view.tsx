import { useAboutSecurity } from "./about-security.model";
import { aboutSecurityStyles } from "./about-security.styles";

const styles = aboutSecurityStyles();

export function AboutSecurity() {
  const view = useAboutSecurity();
  return (
    <section aria-labelledby="about-privacy-title" className={styles.root()}>
      <div className={styles.content()}>
        <div className={styles.titleGroup()}>
          <h2 id="about-privacy-title" className={styles.heading()}>
            {view.securityTitle}
          </h2>
        </div>
        <div className={styles.description()}>
          <p className={styles.ownership()}>{view.securityOwnership}</p>
          <p className={styles.credentials()}>{view.securityCredentials}</p>
          <p className={styles.device()}>{view.securityDevice}</p>
          <p className={styles.accessibility()}>{view.securityAccessibility}</p>
        </div>
      </div>
    </section>
  );
}
