import { useAboutCapabilities } from "./about-capabilities.model";
import { aboutCapabilitiesStyles } from "./about-capabilities.styles";

const styles = aboutCapabilitiesStyles();

export function AboutCapabilities() {
  const view = useAboutCapabilities();
  return (
    <section aria-labelledby="capabilities-title" className={styles.root()}>
      <div className={styles.intro()}>
        <h2 id="capabilities-title" className={styles.heading()}>
          {view.title}
        </h2>
        <p className={styles.description()}>{view.description}</p>
      </div>
      <div className={styles.items()}>
        {view.capabilities.map((capability) => (
          <article key={capability.id} className={styles.item()}>
            <h3 className={styles.itemHeading()}>{capability.title}</h3>
            <p className={styles.itemDescription()}>{capability.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
