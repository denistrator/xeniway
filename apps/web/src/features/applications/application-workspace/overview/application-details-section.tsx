import { WorkspaceTextField } from "../shared/workspace-text-field.tsx";
import { applicationDetailsSectionStyles } from "./application-details-section.styles.ts";

import { type ApplicationDetailsSectionProps, useApplicationDetailsSection } from "./application-details-section.ts";

const styles = applicationDetailsSectionStyles();
export function ApplicationDetailsSection(props: ApplicationDetailsSectionProps) {
  const view = useApplicationDetailsSection(props);

  return view.definitions.map(({ field, id, label, controller, feedback }) => (
    <WorkspaceTextField
      key={field}
      id={id}
      label={label}
      headingLevel={2}
      className={styles.field()}
      headingClassName={styles.heading()}
      controller={controller}
      feedback={feedback}
    />
  ));
}
