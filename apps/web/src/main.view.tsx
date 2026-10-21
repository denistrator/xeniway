import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { App } from "./App.view";
import { OfflineAccessProvider } from "./features/offline/offline-access.view";
import { store } from "./store";
import "./index.css";
import { bootstrap } from "./main.model";

void bootstrap((queryClient, restoration) => (
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <OfflineAccessProvider restoration={restoration}>
          <App />
        </OfflineAccessProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
));
