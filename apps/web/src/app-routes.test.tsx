import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { createAppRoutes } from "./app-routes.model";
import { store } from "./store";
import { initializeTestI18n } from "./test/initialize-test-i18n";

const delayed = vi.hoisted(() => {
  let finish = () => {};
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { promise, finish, ready: false };
});
vi.mock("./pages/about-page.view", () => ({
  AboutPage: () => {
    if (!delayed.ready) {
      throw delayed.promise;
    }
    return <h1>About loaded</h1>;
  },
}));
vi.mock("./features/auth/login/login-page.view", () => ({ LoginPage: () => <h1>Sign in</h1> }));
vi.mock("./components/site-header.view", () => ({ SiteHeader: () => null }));
vi.mock("./features/offline/offline-controls.view", () => ({ OfflineControls: () => null }));
vi.mock("./features/preferences/user-preferences-sync.model", () => ({ useUserPreferencesSync: () => undefined }));
vi.mock("./lib/queries", () => ({
  useCurrentUser: () => ({ data: null }),
  useUserPreferences: () => ({ isPending: false }),
  useCompleteIntroduction: () => ({ mutate: vi.fn() }),
}));

test("keeps the main focus target mounted while a lazy route loads", async () => {
  await initializeTestI18n();
  const client = new QueryClient();
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: ["/about"] });
  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>,
  );
  await screen.findByText("Loading…");
  const main = view.container.querySelector<HTMLElement>("#main-content");
  expect(main).not.toBeNull();
  main?.focus();
  await act(async () => {
    delayed.ready = true;
    delayed.finish();
    await delayed.promise;
  });
  await screen.findByRole("heading", { name: "About loaded" });
  expect(view.container.querySelector("#main-content")).toBe(main);
  expect(main).toHaveFocus();
  client.clear();
});

test("preserves an approved protected destination when redirecting to sign in", async () => {
  await initializeTestI18n();
  const client = new QueryClient();
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: ["/applications/42?tab=activity#event-3"] });

  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>,
  );

  await screen.findByRole("heading", { name: "Sign in" });
  expect(router.state.location.pathname).toBe("/login");
  expect(router.state.location.search).toBe("?returnTo=%2Fapplications%2F42%3Ftab%3Dactivity%23event-3");
  client.clear();
});
