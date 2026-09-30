import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { authKeys } from "../../../../lib/queries";
import { store } from "../../../../store";
import { initializeTestI18n } from "../../../../test/initialize-test-i18n";
import { createApplicationWorkspaceData } from "../test-support/application-workspace-fixtures";
import { ApplicationWorkspacePage } from "./application-workspace-page";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeTestI18n();
});

afterEach(() => vi.unstubAllGlobals());

test("invalid IDs render not found without issuing a request", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);

  renderPage("/applications/0");

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
  expect(fetcher).not.toHaveBeenCalled();
});

test("API not-found responses render the not-found page", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), { status: 404 }),
      ),
  );

  renderPage("/applications/999");

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("renders a loading state while the application request is pending", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );

  renderPage("/applications/3");

  expect(screen.getByText("Loading…")).toBeVisible();
});

test("retries a failed request and renders the workspace", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "REQUEST_FAILED", message: "Request failed" } }), { status: 500 }),
    )
    .mockResolvedValueOnce(workspaceResponse());
  vi.stubGlobal("fetch", fetcher);
  renderPage("/applications/3");

  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(await screen.findByRole("heading", { name: "Northwind" })).toBeVisible();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("composes every workspace domain from one application-detail request", async () => {
  const fetcher = vi.fn().mockResolvedValue(workspaceResponse());
  vi.stubGlobal("fetch", fetcher);
  const { container } = renderPage("/applications/3");

  expect(await screen.findByRole("heading", { name: "Northwind" })).toHaveFocus();
  expect(screen.getByRole("region", { name: "About" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Interview preparation" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Contacts" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Follow-ups" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Activity" })).toBeVisible();
  expect(container.querySelector("main")).toBeNull();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher).toHaveBeenCalledWith("/api/applications/3", expect.anything());
});

function workspaceResponse() {
  return new Response(JSON.stringify({ data: createApplicationWorkspaceData() }), { status: 200 });
}

function renderPage(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(authKeys.me, { data: { user: { id: 1, email: "test@example.com" } } });
  queryClient.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/applications/:id" element={<ApplicationWorkspacePage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}
