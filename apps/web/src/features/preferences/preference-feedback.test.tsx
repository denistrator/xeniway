import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Layout } from "../../components/layout.view";
import { SiteHeader } from "../../components/site-header.view";
import { userPreferencesKeys } from "../../lib/api";
import { authKeys } from "../../lib/queries";
import { closeDrawer, closeWelcome, openWelcome, setJobFormPresentation, setTheme, store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { choiceMade, preferenceFeedbackStore } from "./preference-feedback-state";
import { SettingsPreferences } from "./settings-preferences.view";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("../../lib/api", async (original) => ({
  ...(await original<typeof import("../../lib/api")>()),
  updateUserPreferences: save,
}));
let client: QueryClient;

beforeEach(async () => {
  await initializeTestI18n();
  store.dispatch(setTheme("system"));
  store.dispatch(setJobFormPresentation("drawer"));
  store.dispatch(closeDrawer());
  store.dispatch(closeWelcome());
  save.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1 } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
});

afterEach(() => {
  client.clear();
  vi.useRealTimers();
});

test("successful preference feedback expires, while a later explicit choice has its own lifetime", async () => {
  vi.useFakeTimers();
  save.mockResolvedValue({ data: { preferences: {} } });
  renderPage("/settings");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByRole("status")).toHaveTextContent("Saved to your account.");
  act(() => vi.advanceTimersByTime(10_000));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  act(() => preferenceFeedbackStore.dispatch(choiceMade("language")));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Theme: Dark. Change theme" }));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByRole("status")).toHaveTextContent("Saved to your account.");
  expect(save).toHaveBeenCalledTimes(2);
});

test("failed preference saves keep their retry and outstanding values after ten seconds", async () => {
  vi.useFakeTimers();
  save.mockRejectedValue(new Error("account unavailable"));
  renderPage("/settings");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
    await vi.advanceTimersByTimeAsync(0);
  });
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("button", { name: "Retry account save" })).toBeVisible();
  expect(save).toHaveBeenCalledTimes(1);
  save.mockResolvedValue({ data: { preferences: {} } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Retry account save" }));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(save.mock.calls[1][0]).toEqual({ selectedTheme: "dark" });
});

function renderPage(path: string) {
  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <SiteHeader />
          <Routes>
            <Route path="/about" element={null} />
            <Route path="/settings" element={<SettingsPreferences />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
}

test("announces a shared multi-field retry once with the header and Settings mounted", async () => {
  const user = userEvent.setup();
  save.mockRejectedValue(new Error("account unavailable"));
  renderPage("/settings");
  await user.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
  await screen.findByRole("button", { name: "Retry account save" });
  await user.click(screen.getByRole("button", { name: "Language: English. Change language" }));
  await user.click(screen.getByRole("menuitemradio", { name: "English" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(screen.getAllByRole("status")).toHaveLength(1);
  save.mockResolvedValue({ data: { preferences: {} } });
  await user.click(screen.getByRole("button", { name: "Retry account save" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
  expect(save.mock.calls[2][0]).toEqual({ selectedTheme: "dark", selectedLanguage: "en" });
  expect(screen.getByRole("status")).toHaveTextContent("Saved to your account.");
});

test("dismissing compact feedback preserves outstanding choices for an explicit Settings retry", async () => {
  const user = userEvent.setup();
  save.mockRejectedValue(new Error("account unavailable"));
  renderPage("/about");
  await user.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
  await screen.findByRole("button", { name: "Retry account save" });
  await user.click(screen.getByRole("button", { name: "Dismiss preference notice" }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Settings" })).toHaveFocus();
  await user.click(screen.getByRole("link", { name: "Settings" }));
  save.mockResolvedValue({ data: { preferences: {} } });
  await user.click(screen.getByRole("button", { name: "Retry account save" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1][0]).toEqual({ selectedTheme: "dark" });
  expect(screen.getByRole("status")).toHaveTextContent("Saved to your account.");
});

test("a dismissed successful notice can announce a later explicit choice", async () => {
  const user = userEvent.setup();
  save.mockResolvedValue({ data: { preferences: {} } });
  renderPage("/about");
  await user.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
  await screen.findByText("Saved to your account.");
  await user.click(screen.getByRole("button", { name: "Dismiss preference notice" }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Settings" })).toHaveFocus();
  await user.click(screen.getByRole("link", { name: "Settings" }));
  await user.click(screen.getByRole("link", { name: "About" }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Theme: Dark. Change theme" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Saved to your account.");
  expect(save.mock.calls[1][0]).toEqual({ selectedTheme: "light" });
});

test("a returning user's resolved welcome intent does not hide header failure feedback", async () => {
  const user = userEvent.setup();
  save.mockRejectedValue(new Error("account unavailable"));
  store.dispatch(openWelcome());
  client.setQueryData(userPreferencesKeys.current(1), {
    data: {
      preferences: {
        selectedTheme: null,
        selectedLanguage: null,
        selectedFormPresentation: null,
        wasIntroduced: true,
      },
    },
  });
  const router = createMemoryRouter([{ path: "/about", element: <Layout /> }], { initialEntries: ["/about"] });
  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Theme: System. Change theme" }));
  expect(await screen.findByRole("button", { name: "Retry account save" })).toBeVisible();
  expect(screen.getAllByRole("status")).toHaveLength(1);
});

test("only the active create dialog announces its presentation save while Settings is behind it", async () => {
  const user = userEvent.setup();
  save.mockRejectedValue(new Error("account unavailable"));
  client.setQueryData(userPreferencesKeys.current(1), {
    data: {
      preferences: {
        selectedTheme: null,
        selectedLanguage: null,
        selectedFormPresentation: null,
        wasIntroduced: true,
      },
    },
  });
  const router = createMemoryRouter(
    [{ element: <Layout />, children: [{ path: "/settings", element: <SettingsPreferences /> }] }],
    { initialEntries: ["/settings"] },
  );
  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>,
  );
  await user.click(screen.getByRole("button", { name: "Add job" }));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  await user.click(await screen.findByRole("button", { name: "Switch to modal" }));
  await screen.findByRole("button", { name: "Retry account save" });
  const announcements = screen.getAllByRole("status");
  expect(announcements).toHaveLength(1);
  expect(screen.getByRole("dialog")).toContainElement(announcements[0]);
});
