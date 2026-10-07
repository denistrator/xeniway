import { applicationWorkspaceNavigationStyles } from "./application-workspace-navigation.styles.ts";

import {
  type ApplicationWorkspaceNavigationProps,
  useApplicationWorkspaceNavigation,
} from "./application-workspace-navigation.ts";

const styles = applicationWorkspaceNavigationStyles();
export function ApplicationWorkspaceNavigation(props: ApplicationWorkspaceNavigationProps) {
  const view = useApplicationWorkspaceNavigation(props);

  return (
    <nav aria-label={view.navigationLabel} className={styles.root()}>
      {view.directions.map(({ direction, Icon, label, disabled, onClick }) => (
        <button
          key={direction}
          type="button"
          aria-label={label}
          title={label}
          className={styles.button()}
          disabled={disabled}
          onClick={onClick}
        >
          <Icon aria-hidden="true" className={styles.icon()} />
        </button>
      ))}
    </nav>
  );
}
