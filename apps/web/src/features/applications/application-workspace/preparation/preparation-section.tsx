import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card.tsx";
import { WorkspaceTextField } from "../shared/workspace-text-field.tsx";
import { preparationSectionStyles } from "./preparation-section.styles.ts";

import { type PreparationSectionProps, usePreparationSection } from "./preparation-section.ts";

const styles = preparationSectionStyles();
export const PreparationSection = memo(function PreparationSection(props: PreparationSectionProps) {
  const view = usePreparationSection(props);

  return (
    <section className={styles.root()} aria-labelledby={view.headingId}>
      <Card>
        <CardHeader>
          <CardTitle id={view.headingId} className={styles.heading()}>
            {view.headingLabel}
          </CardTitle>
          <p className={styles.help()}>{view.helpLabel}</p>
        </CardHeader>
        <CardContent className={styles.content()}>
          {view.fields.map(({ key, controller, label, feedback }) => (
            <WorkspaceTextField
              key={key}
              id={`${view.applicationId}-${key}`}
              label={label}
              headingLevel={3}
              className={styles.field()}
              headingClassName={styles.fieldHeading()}
              controller={controller}
              feedback={feedback}
            />
          ))}
        </CardContent>
      </Card>
    </section>
  );
});
