import { useLanguageSelector } from "./language-selector.model";
import { languageSelectorStyles } from "./language-selector.styles";

const styles = languageSelectorStyles();
export function LanguageSelector() {
  const { open, containerRef, triggerRef, currentOption, label, toggleOpen, handleMenuKeyDown, menuOptions } =
    useLanguageSelector();
  return (
    <div ref={containerRef} className={styles.root()}>
      <button
        ref={triggerRef}
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
        <div role="menu" className={styles.menu()} onKeyDown={handleMenuKeyDown}>
          {menuOptions.map((option) => (
            <button
              key={option.value}
              ref={option.setRef}
              role="menuitemradio"
              aria-checked={option.current}
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
