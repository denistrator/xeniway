import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { type RootState, setSearch } from "../store";

export function useApplicationSearch() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const search = useSelector((state: RootState) => state.ui.search);
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    dispatch(setSearch(event.target.value));
  }
  function handleClear() {
    dispatch(setSearch(""));
  }
  return {
    search,
    populated: Boolean(search),
    handleChange,
    handleClear,
    searchLabel: t("applications.search"),
    clearLabel: t("applications.clearSearch"),
  };
}
