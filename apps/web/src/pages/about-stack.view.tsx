import { type StackBlockProps, useAboutStack, useStackBlock } from "./about-stack.model";
import { aboutStackStyles } from "./about-stack.styles";

const styles = aboutStackStyles();

function StackBlock({ title, description, items }: StackBlockProps) {
  const rows = useStackBlock(items);
  return (
    <article className={styles.block()}>
      <h3 className={styles.blockHeading()}>{title}</h3>
      <p className={styles.blockDescription()}>{description}</p>
      <dl className={styles.definitions()}>
        {rows.map(({ name, href, Icon, description }) => (
          <div key={name} className={styles.definition()}>
            <dt className={styles.term()}>
              <Icon aria-hidden="true" size={16} strokeWidth={1.8} className={styles.icon()} />
              {href ? (
                <a href={href} target="_blank" rel="noreferrer noopener" className={styles.link()}>
                  {name}
                </a>
              ) : (
                name
              )}
            </dt>
            <dd className={styles.detail()}>{description}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function AboutStack() {
  const view = useAboutStack();
  return (
    <details className={styles.root()}>
      <summary className={styles.summary()}>{view.title}</summary>
      <p className={styles.description()}>{view.description}</p>
      <div className={styles.blocks()}>
        {view.blocks.map((block) => (
          <StackBlock key={block.id} title={block.title} description={block.description} items={block.items} />
        ))}
      </div>
    </details>
  );
}
