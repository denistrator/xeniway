import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import type { ApplicationDetailResponse } from "@xeniway/shared";
import { MemoryRouter } from "react-router-dom";
import { authKeys } from "../../../../lib/queries";
import { ApplicationWorkspaceContent } from "../page/application-workspace-content";
import { createApplicationWorkspaceData } from "./application-workspace-fixtures";

export function renderApplicationWorkspace(overrides: Partial<ApplicationDetailResponse["data"]> = {}): RenderResult {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ApplicationWorkspaceContent data={createApplicationWorkspaceData(overrides)} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
