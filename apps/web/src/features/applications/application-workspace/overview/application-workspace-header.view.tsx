import { Link } from "react-router-dom";
import { ApplicationCompactField } from "./application-compact-field.view";
import { ApplicationStatusControl } from "./application-status-control.view";
import {
  type ApplicationWorkspaceHeaderProps,
  useApplicationWorkspaceHeader,
  type WorkspaceHeaderField,
} from "./application-workspace-header.model";
import { applicationWorkspaceHeaderStyles } from "./application-workspace-header.styles";
import { ApplicationWorkspaceNavigation } from "./application-workspace-navigation.view";

const styles = applicationWorkspaceHeaderStyles();
export function ApplicationWorkspaceHeader(props: ApplicationWorkspaceHeaderProps) {
  const view = useApplicationWorkspaceHeader(props);
  const renderField = (field: WorkspaceHeaderField) => (
    <ApplicationCompactField
      key={field.field}
      fields={view.fields}
      {...field}
      displayValue={
        field.hasDisplayValue ? (
          <>
            {field.displayKind === "position" && <p className={styles.position()}>{view.application.position}</p>}
            {field.displayKind === "company" && (
              <h1 ref={view.headingRef} tabIndex={-1} className={styles.company()}>
                {view.application.company}
              </h1>
            )}
            {field.displayKind === "jobUrl" && view.safeJobUrl && (
              <a className={styles.jobLink()} href={view.safeJobUrl} target="_blank" rel="noopener noreferrer">
                {view.safeJobUrl}
              </a>
            )}
            {field.displayKind === "value" && field.displayValue}
          </>
        ) : null
      }
    />
  );

  return (
    <header className={styles.root()}>
      <div className={styles.navigation()}>
        <Link className={styles.backLink()} to={view.backTo}>
          {view.backLabel}
        </Link>
        <ApplicationWorkspaceNavigation application={view.application} />
      </div>
      <div className={styles.summary()}>
        <div className={view.slotClasses.heading}>
          {view.headingFields.map(renderField)}
          <ApplicationStatusControl application={view.application} fields={view.fields} />
        </div>
        <div className={styles.actions()}>{view.actions}</div>
      </div>
      <div className={styles.metadata()}>{view.metadataFields.map(renderField)}</div>
    </header>
  );
}
