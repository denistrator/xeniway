import { useAboutRecords } from "./about-records.model";
import { aboutRecordsStyles } from "./about-records.styles";

const styles = aboutRecordsStyles();

export function AboutRecords() {
  const groups = useAboutRecords();
  return groups.map((group) => (
    <section key={group.id} aria-labelledby={group.headingId} className={styles.root()}>
      <h2 id={group.headingId} className={styles.heading()}>
        {group.title}
      </h2>
      <p className={styles.description()}>{group.description}</p>
      <dl className={styles.items()}>
        {group.items.map((item) => (
          <div key={item.id} className={styles.item()}>
            <dt className={styles.term()}>{item.title}</dt>
            <dd className={styles.detail()}>{item.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  ));
}
