import { AboutCapabilities } from "./about-capabilities.tsx";
import { AboutHero } from "./about-hero.tsx";
import { aboutPageStyles } from "./about-page.styles.ts";
import { AboutSecurity } from "./about-security.tsx";
import { AboutStack } from "./about-stack.tsx";

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
