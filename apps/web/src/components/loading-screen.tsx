import { loadingScreenStyles } from "./loading-screen.styles.ts";
import { useLoadingScreen } from "./loading-screen.ts";

const styles = loadingScreenStyles();

export function LoadingScreen() {
  const view = useLoadingScreen();
  return <div className={styles.root()}>{view.loading}</div>;
}
