import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, expect, test, vi } from "vitest";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";
import { readLocalUserPreferences } from "../../lib/user-preferences";
import { setTheme, store } from "../../store";
import { ThemeSelector } from "./theme-selector";

vi.mock("../../lib/queries", () => ({
  useCurrentUser: vi.fn(),
  useUpdateUserPreferences: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useCurrentUser).mockReturnValue({ data: { id: 1 } } as never);
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate: vi.fn() } as never);
  store.dispatch(setTheme("system"));
});

test("persists an authenticated theme change before preferences load", async () => {
  const user = userEvent.setup();
  const mutate = vi.fn();
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate } as never);
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient()}>
        <ThemeSelector />
      </QueryClientProvider>
    </Provider>,
  );

  const button = screen.getByRole("button");
  await user.click(button);

  expect(mutate).toHaveBeenCalledWith({ selectedTheme: "dark" });
});

test("updates the UI immediately and persists the selected theme", async () => {
  const user = userEvent.setup();
  const mutate = vi.fn();
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate } as never);
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient()}>
        <ThemeSelector />
      </QueryClientProvider>
    </Provider>,
  );

  await user.click(screen.getByRole("button"));

  expect(mutate).toHaveBeenCalledWith({ selectedTheme: "dark" });
  expect(screen.getByRole("button")).toHaveAccessibleName("Theme: Dark. Change theme");
  expect(readLocalUserPreferences()).toMatchObject({ theme: "dark" });
  expect(window.localStorage.getItem("userPreferences")).toContain('"theme":"dark"');
});
