import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { closeDrawer, closeWelcome, openCreateDrawer, store } from "../store";
import { initializeTestI18n } from "../test/initialize-test-i18n";
import { Layout } from "./layout.view";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), hostImported: vi.fn() }));

vi.mock("./site-header.view", () => ({ SiteHeader: () => null }));
vi.mock("../features/applications/form/job-manager-host.view", () => {
  mocks.hostImported();
  return { JobManagerHost: () => null };
});
vi.mock("../lib/queries", () => ({
  useCurrentUser: () => mocks.currentUser(),
  useUserPreferences: () => ({ data: undefined, isPending: false, error: null }),
  useCompleteIntroduction: () => ({ mutate: vi.fn() }),
}));

// Keep the cold-import assertion in its own isolated file: React.lazy caches
// resolved modules for the lifetime of a module, independently of mock calls.
test("does not evaluate the host module until the first authenticated create action", async () => {
  await initializeTestI18n();
  store.dispatch(closeDrawer());
  store.dispatch(closeWelcome());
  mocks.currentUser.mockReturnValue({ data: undefined, isPending: true });
  const client = new QueryClient();
  const element = () => (
    <StrictMode>
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <Layout />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    </StrictMode>
  );
  const view = render(element());
  await settleImports();
  expect(mocks.hostImported).not.toHaveBeenCalled();

  mocks.currentUser.mockReturnValue({ data: null, isPending: false });
  view.rerender(element());
  await settleImports();
  expect(mocks.hostImported).not.toHaveBeenCalled();

  mocks.currentUser.mockReturnValue({ data: { id: 1, email: "candidate@example.com" }, isPending: false });
  view.rerender(element());
  await settleImports();
  expect(mocks.hostImported).not.toHaveBeenCalled();

  act(() => store.dispatch(openCreateDrawer()));
  await settleImports();
  expect(mocks.hostImported).toHaveBeenCalledTimes(1);
  act(() => store.dispatch(closeDrawer()));
  act(() => store.dispatch(openCreateDrawer()));
  await settleImports();
  expect(mocks.hostImported).toHaveBeenCalledTimes(1);
});

async function settleImports() {
  await act(() => vi.dynamicImportSettled());
}
