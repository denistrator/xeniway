import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { initializeI18n } from "./i18n/i18n";
import { store } from "./store";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});
const root = document.getElementById("root");

async function bootstrap() {
  if (!root) throw new Error("The application root element is missing");

  await initializeI18n();

  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  );
}

void bootstrap();
