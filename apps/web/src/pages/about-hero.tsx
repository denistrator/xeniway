import { aboutHeroStyles } from "./about-hero.styles.ts";
import { useAboutHero } from "./about-hero.ts";

const styles = aboutHeroStyles();

export function AboutHero() {
  const view = useAboutHero();
  return (
    <section className={styles.root()}>
      <h1 className={styles.heading()}>{view.heroTitle}</h1>
      <p className={styles.description()}>{view.heroDescription}</p>
    </section>
  );
}
