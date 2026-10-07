import { themeSelectorStyles } from "./theme-selector.styles.ts";
import { useThemeSelector } from "./theme-selector.ts";

const styles = themeSelectorStyles();

export { nextThemePreference } from "./theme-selector.ts";
export function ThemeSelector() {
  const { CurrentIcon, handleChange, label } = useThemeSelector();
  return (
    <button aria-label={label} className={styles.button()} onClick={handleChange} type="button">
      <CurrentIcon aria-hidden="true" size={17} strokeWidth={2} />
    </button>
  );
}
