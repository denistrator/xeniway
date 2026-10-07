import { setBooleanFeatureFlagResolver } from "@atlaskit/platform-feature-flags";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { loadOfflineSnapshot, restoreOfflineAccount } from "./features/offline/offline-store";
import { initializeI18n } from "./i18n/i18n";

setBooleanFeatureFlagResolver(() => false);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});
const root = document.getElementById("root");

export async function bootstrap(
  render: (queryClient: QueryClient, restoration: ReturnType<typeof createRestoration>) => ReactNode,
) {
  if (!root) {
    throw new Error("The application root element is missing");
  }

  await initializeI18n();
  const restoration = createRestoration();
  createRoot(root).render(render(queryClient, restoration));
}

function createRestoration() {
  return Promise.race([
    (async () => {
      const account = await restoreOfflineAccount();
      if (!account) {
        return null;
      }
      const snapshot = await loadOfflineSnapshot(account.userId);
      return snapshot ? { account, snapshot } : null;
    })().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
  ]);
}
