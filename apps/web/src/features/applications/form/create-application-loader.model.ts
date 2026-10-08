import { lazy, type RefObject, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useCurrentUser } from "../../../lib/queries";
import type { RootState } from "../../../store";

export type CreateApplicationLoaderProps = { openerRef: RefObject<HTMLElement | null> };
export const JobManagerHost = lazy(() =>
  import("./job-manager-host.view").then(({ JobManagerHost }) => ({ default: JobManagerHost })),
);
export function useCreateApplicationLoaderPresentation() {
  const user = useCurrentUser();

  return { user };
}
export function useAuthenticatedCreateApplicationLoaderPresentation() {
  const { t } = useTranslation();
  const open = useSelector((state: RootState) => state.ui.drawer.open);
  const [hasOpened, setHasOpened] = useState(false);
  useEffect(() => {
    if (open) {
      setHasOpened(true);
    }
  }, [open]);

  return { open, hasOpened, loadingLabel: t("common.loading") };
}
