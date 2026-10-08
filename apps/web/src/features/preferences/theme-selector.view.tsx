import { useThemeSelector } from "./theme-selector.model";
import { themeSelectorStyles } from "./theme-selector.styles";

const styles = themeSelectorStyles();

export { nextThemePreference } from "./theme-selector.model";
export function ThemeSelector() {
  const { CurrentIcon, handleChange, label } = useThemeSelector();
  return (
    <button aria-label={label} className={styles.button()} onClick={handleChange} type="button">
      <CurrentIcon aria-hidden="true" size={17} strokeWidth={2} />
    </button>
  );
}
