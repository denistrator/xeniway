import { AboutCapabilities } from "./about-capabilities.view";
import { AboutHero } from "./about-hero.view";
import { aboutPageStyles } from "./about-page.styles";
import { AboutRecords } from "./about-records.view";
import { AboutSecurity } from "./about-security.view";
import { AboutStack } from "./about-stack.view";
import { AboutWorkflow } from "./about-workflow.view";

const styles = aboutPageStyles();

export function AboutPage() {
  return (
    <div className={styles.root()}>
      <div className={styles.content()}>
        <AboutHero />
        <AboutWorkflow />
        <AboutCapabilities />
        <AboutRecords />
        <AboutSecurity />
        <AboutStack />
      </div>
    </div>
  );
}
