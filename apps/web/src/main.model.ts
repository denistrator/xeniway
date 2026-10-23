import { setBooleanFeatureFlagResolver } from "@atlaskit/platform-feature-flags";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { restoreOfflineData } from "./features/offline/restore-offline";
import { initializeI18n } from "./i18n/i18n";

setBooleanFeatureFlagResolver(() => false);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});
const root = document.getElementById("root");

export async function bootstrap(
  render: (queryClient: QueryClient, restoration: ReturnType<typeof restoreOfflineData>) => ReactNode,
) {
  if (!root) {
    throw new Error("The application root element is missing");
  }

  await initializeI18n();
  const restoration = restoreOfflineData();
  // React attaches the runtime subscriber after rendering; observe early storage failures meanwhile.
  void restoration.catch(() => {});
  createRoot(root).render(render(queryClient, restoration));
}
