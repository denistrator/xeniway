import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { type RootState, setSearch } from "../store";
import { Button } from "./ui/button";
import { FloatingLabel } from "./ui/floating-label";
import { Input } from "./ui/input";

export function ApplicationSearch() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const search = useSelector((state: RootState) => state.ui.search);

  return (
    <FloatingLabel
      htmlFor="application-search"
      label={t("applications.search")}
      icon={Search}
      className="min-w-64 flex-1"
    >
      <Input
        id="application-search"
        className={search ? "peer pe-10" : "peer"}
        placeholder=" "
        name="search"
        autoComplete="off"
        value={search}
        onChange={(event) => dispatch(setSearch(event.target.value))}
      />
      {search && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-1 top-1/2 size-8 -translate-y-1/2"
          aria-label={t("applications.clearSearch")}
          title={t("applications.clearSearch")}
          onClick={() => dispatch(setSearch(""))}
        >
          <X aria-hidden="true" size={16} />
          <span className="sr-only">{t("applications.clearSearch")}</span>
        </Button>
      )}
    </FloatingLabel>
  );
}
