import { setBooleanFeatureFlagResolver } from "@atlaskit/platform-feature-flags";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { OfflineAccessProvider } from "./features/offline/offline-access";
import { loadOfflineSnapshot, restoreOfflineAccount } from "./features/offline/offline-store";
import { initializeI18n } from "./i18n/i18n";
import { store } from "./store";
import "./index.css";

setBooleanFeatureFlagResolver(() => false);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});
const root = document.getElementById("root");

async function bootstrap() {
  if (!root) throw new Error("The application root element is missing");

  await initializeI18n();
  const restoration = Promise.race([
    (async () => {
      const account = await restoreOfflineAccount();
      if (!account) return null;
      const snapshot = await loadOfflineSnapshot(account.userId);
      return snapshot ? { account, snapshot } : null;
    })().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
  ]);

  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <OfflineAccessProvider restoration={restoration}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </OfflineAccessProvider>
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  );
}

void bootstrap();
