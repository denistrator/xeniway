import type { CreateApplicationInput } from "@xeniway/shared";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { useApplicationMutations, useCurrentUser } from "../../../lib/queries";
import { closeDrawer, type RootState } from "../../../store";

export type JobManagerHostProps = { openerRef?: RefObject<HTMLElement | null> };
export function useJobManagerHostPresentation() {
  const user = useCurrentUser();

  return { user };
}
export function useAuthenticatedJobManagerPresentation() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isOpen = useSelector((state: RootState) => state.ui.drawer.open);
  const mutations = useApplicationMutations();
  const pending = mutations.create.isPending;
  const mutationError = mutations.create.error;
  const mutationErrorCode = mutationError instanceof ApiRequestError ? mutationError.code : "REQUEST_FAILED";
  async function handleSave(input: CreateApplicationInput) {
    await mutations.create.mutateAsync(input);
    dispatch(closeDrawer());
  }
  const close = () => dispatch(closeDrawer());
  const selectionLabel = t(getApiErrorKey(mutationErrorCode));
  return { isOpen, pending, mutationError, handleSave, close, selectionLabel };
}
