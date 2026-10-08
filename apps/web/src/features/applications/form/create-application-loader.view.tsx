import { Suspense } from "react";
import {
  type CreateApplicationLoaderProps,
  JobManagerHost,
  useAuthenticatedCreateApplicationLoaderPresentation,
  useCreateApplicationLoaderPresentation,
} from "./create-application-loader.model";
import { createApplicationLoaderStyles } from "./create-application-loader.styles";

const styles = createApplicationLoaderStyles();

export function CreateApplicationLoader({ openerRef }: CreateApplicationLoaderProps) {
  const { user } = useCreateApplicationLoaderPresentation();

  return user.data ? <AuthenticatedCreateApplicationLoader key={user.data.id} openerRef={openerRef} /> : null;
}

function AuthenticatedCreateApplicationLoader({ openerRef }: CreateApplicationLoaderProps) {
  const { loadingLabel, open, hasOpened } = useAuthenticatedCreateApplicationLoaderPresentation();
  if (!open && !hasOpened) {
    return null;
  }
  return (
    <Suspense
      fallback={
        <p role="status" className={styles.loading()}>
          {loadingLabel}
        </p>
      }
    >
      <JobManagerHost openerRef={openerRef} />
    </Suspense>
  );
}

export type { CreateApplicationLoaderProps } from "./create-application-loader.model";
