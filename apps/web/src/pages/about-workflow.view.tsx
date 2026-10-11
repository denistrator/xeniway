import { useAboutWorkflow } from "./about-workflow.model";
import { aboutWorkflowStyles } from "./about-workflow.styles";

const styles = aboutWorkflowStyles();

export function AboutWorkflow() {
  const view = useAboutWorkflow();
  return (
    <section aria-labelledby="workflow-title" className={styles.root()}>
      <h2 id="workflow-title" className={styles.heading()}>
        {view.title}
      </h2>
      <p className={styles.description()}>{view.description}</p>
      <div className={styles.stages()}>
        {view.stages.map((stage) => (
          <article key={stage.id} className={styles.stage()}>
            <h3 className={styles.stageHeading()}>{stage.title}</h3>
            <p className={styles.stageText()}>{stage.text}</p>
          </article>
        ))}
      </div>
      <h3 id="workflow-statuses" className={styles.statusHeading()}>
        {view.statusTitle}
      </h3>
      <ul aria-labelledby="workflow-statuses" className={styles.statuses()}>
        {view.statuses.map((status) => (
          <li key={status.id} className={styles.status()}>
            {status.label}
          </li>
        ))}
      </ul>
      <p className={styles.note()}>{view.note}</p>
    </section>
  );
}
