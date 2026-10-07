import { lazy, type RefObject, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useCurrentUser } from "../../../lib/queries";
import type { RootState } from "../../../store";

const JobManagerHost = lazy(() =>
  import("./job-manager-host").then(({ JobManagerHost }) => ({ default: JobManagerHost })),
);

type CreateApplicationLoaderProps = { openerRef: RefObject<HTMLElement | null> };

export function CreateApplicationLoader({ openerRef }: CreateApplicationLoaderProps) {
  const user = useCurrentUser();
  return user.data ? <AuthenticatedCreateApplicationLoader key={user.data.id} openerRef={openerRef} /> : null;
}

function AuthenticatedCreateApplicationLoader({ openerRef }: CreateApplicationLoaderProps) {
  const { t } = useTranslation();
  const open = useSelector((state: RootState) => state.ui.drawer.open);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (open) {
      setHasOpened(true);
    }
  }, [open]);

  if (!open && !hasOpened) {
    return null;
  }

  return (
    <Suspense
      fallback={
        <p role="status" className="sr-only">
          {t("common.loading")}
        </p>
      }
    >
      <JobManagerHost openerRef={openerRef} />
    </Suspense>
  );
}
