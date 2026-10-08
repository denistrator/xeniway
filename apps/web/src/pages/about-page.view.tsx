import { AboutCapabilities } from "./about-capabilities.view";
import { AboutHero } from "./about-hero.view";
import { aboutPageStyles } from "./about-page.styles";
import { AboutSecurity } from "./about-security.view";
import { AboutStack } from "./about-stack.view";

const styles = aboutPageStyles();

export function AboutPage() {
  return (
    <div className={styles.root()}>
      <div className={styles.content()}>
        <AboutHero />
        <AboutCapabilities />
        <AboutStack />
        <AboutSecurity />
      </div>
    </div>
  );
}
