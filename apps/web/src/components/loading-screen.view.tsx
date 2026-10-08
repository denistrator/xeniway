import { useLoadingScreen } from "./loading-screen.model";
import { loadingScreenStyles } from "./loading-screen.styles";

const styles = loadingScreenStyles();

export function LoadingScreen() {
  const view = useLoadingScreen();
  return <div className={styles.root()}>{view.loading}</div>;
}
