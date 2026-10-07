import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.tsx";
import { OfflineAccessProvider } from "./features/offline/offline-access.tsx";
import { store } from "./store";
import "./index.css";
import { bootstrap } from "./main.ts";

void bootstrap((queryClient, restoration) => (
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
  </StrictMode>
));
