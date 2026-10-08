import { Search, X } from "lucide-react";
import { useApplicationSearch } from "./application-search.model";
import { applicationSearchStyles } from "./application-search.styles";
import { Button } from "./ui/button.view";
import { FloatingLabel } from "./ui/floating-label.view";
import { Input } from "./ui/input.view";

const styles = applicationSearchStyles();

export function ApplicationSearch() {
  const view = useApplicationSearch();
  return (
    <FloatingLabel htmlFor="application-search" label={view.searchLabel} icon={Search} className={styles.label()}>
      <Input
        id="application-search"
        className={styles.input({ populated: view.populated })}
        placeholder=" "
        name="search"
        autoComplete="off"
        value={view.search}
        onChange={view.handleChange}
      />
      {view.search && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={styles.clearButton()}
          aria-label={view.clearLabel}
          title={view.clearLabel}
          onClick={view.handleClear}
        >
          <X aria-hidden="true" size={16} />
          <span className={styles.clearText()}>{view.clearLabel}</span>
        </Button>
      )}
    </FloatingLabel>
  );
}
