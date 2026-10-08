import { useLanguageSelector } from "./language-selector.model";
import { languageSelectorStyles } from "./language-selector.styles";

const styles = languageSelectorStyles();
export function LanguageSelector() {
  const { open, containerRef, currentOption, label, toggleOpen, menuOptions } = useLanguageSelector();
  return (
    <div ref={containerRef} className={styles.root()}>
      <button
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={styles.trigger()}
        onClick={toggleOpen}
        type="button"
      >
        {currentOption.label}
      </button>
      {open && (
        <div role="menu" className={styles.menu()}>
          {menuOptions.map((option) => (
            <button
              key={option.value}
              role="menuitem"
              type="button"
              className={styles.option()}
              onClick={option.onSelect}
            >
              <span aria-hidden="true" className={styles.flag()}>
                {option.flag}
              </span>
              <span className={styles.optionLabel()}>{option.translatedLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
