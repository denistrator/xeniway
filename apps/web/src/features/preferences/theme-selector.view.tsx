import { PreferenceFeedback } from "./preference-feedback.view";
import { useThemeSelector } from "./theme-selector.model";
import { themeSelectorStyles } from "./theme-selector.styles";

const styles = themeSelectorStyles();

export { nextThemePreference } from "./theme-selector.model";
export function ThemeSelector({ showFeedback = true }: { showFeedback?: boolean }) {
  const { CurrentIcon, handleChange, label, triggerRef } = useThemeSelector();
  return (
    <div className={styles.root()}>
      <button ref={triggerRef} aria-label={label} className={styles.button()} onClick={handleChange} type="button">
        <CurrentIcon aria-hidden="true" size={17} strokeWidth={2} />
      </button>
      {showFeedback && <PreferenceFeedback kind="theme" returnFocusRef={triggerRef} />}
    </div>
  );
}
