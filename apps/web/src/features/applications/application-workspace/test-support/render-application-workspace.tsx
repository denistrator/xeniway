import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import type { ApplicationDetailResponse } from "@xeniway/shared";
import { MemoryRouter } from "react-router-dom";
import { authKeys } from "../../../../lib/queries";
import { OfflineAccessProvider } from "../../../offline/offline-access";
import { ApplicationWorkspaceContent } from "../page/application-workspace-content";
import { createApplicationWorkspaceData } from "./application-workspace-fixtures";

export function renderApplicationWorkspace(
  overrides: Partial<ApplicationDetailResponse["data"]> = {},
  withOfflineAccess = false,
): RenderResult {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  const workspace = <ApplicationWorkspaceContent data={createApplicationWorkspaceData(overrides)} />;
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {withOfflineAccess ? <OfflineAccessProvider>{workspace}</OfflineAccessProvider> : workspace}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
