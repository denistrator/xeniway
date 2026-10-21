import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import type { ApplicationDetailResponse, JobApplication } from "@xeniway/shared";
import { Provider } from "react-redux";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { applicationKeys } from "../../../../lib/api";
import { authKeys } from "../../../../lib/queries";
import { store } from "../../../../store";
import { OfflineAccessProvider } from "../../../offline/offline-access.view";
import { ApplicationWorkspaceContent } from "../page/application-workspace-content.view";
import { ApplicationWorkspacePage } from "../page/application-workspace-page.view";
import { createApplicationWorkspaceData } from "./application-workspace-fixtures";

export function renderApplicationWorkspace(
  overrides: Partial<ApplicationDetailResponse["data"]> = {},
  withOfflineAccess = false,
): RenderResult {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  for (const collection of ["active", "archive", "blacklist"] as const) {
    client.setQueryData(applicationKeys.list(1, collection), { data: { applications: [] } });
  }

  const workspace = <ApplicationWorkspaceContent data={createApplicationWorkspaceData(overrides)} />;
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {withOfflineAccess ? <OfflineAccessProvider>{workspace}</OfflineAccessProvider> : workspace}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function renderApplicationWorkspacePage(path: string, applications: JobApplication[] = []): RenderResult {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "test@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  for (const collection of ["active", "archive", "blacklist"] as const) {
    client.setQueryData(applicationKeys.list(1, collection), { data: { applications } });
  }
  const router = createMemoryRouter([{ path: "/applications/:id", element: <ApplicationWorkspacePage /> }], {
    initialEntries: [path],
  });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>,
  );
}
