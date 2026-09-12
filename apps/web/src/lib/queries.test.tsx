import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { UserPreferences, UserPreferencesResponse } from "@xeniway/shared";
import { Provider } from "react-redux";
import { beforeEach, expect, test, vi } from "vitest";
import { store } from "../store";
import { userPreferencesKeys } from "./api";
import { authKeys, useAuthMutations, useUpdateUserPreferences, useUserPreferences } from "./queries";
import { userPreferencesStorageKey } from "./user-preferences";

const { getUserPreferences, logout, updateUserPreferences } = vi.hoisted(() => ({
  getUserPreferences: vi.fn(),
  logout: vi.fn(),
  updateUserPreferences: vi.fn(),
}));

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, getUserPreferences, logout, updateUserPreferences };
});

const accountA = { id: 1, email: "a@example.com" };
const accountB = { id: 2, email: "b@example.com" };
const response = (selectedTheme: UserPreferences["selectedTheme"]): UserPreferencesResponse => ({
  data: {
    preferences: {
      wasIntroduced: false,
      selectedLanguage: null,
      selectedTheme,
      selectedFormPresentation: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  },
});

function setup(user = accountA) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(authKeys.me, { data: { user } });
  queryClient.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  getUserPreferences.mockReset();
  logout.mockReset();
  updateUserPreferences.mockReset();
});

test("removes all user preference cache entries after successful logout", async () => {
  logout.mockResolvedValue({ data: { message: "Logged out" } });
  const { queryClient, wrapper } = setup();
  const localPreferences = JSON.stringify({ theme: "dark", language: "uk", wasIntroduced: true });
  window.localStorage.setItem(userPreferencesStorageKey, localPreferences);
  queryClient.setQueryData(userPreferencesKeys.current(accountA.id), response("dark"));
  queryClient.setQueryData(userPreferencesKeys.current(accountB.id), response("light"));

  const { result } = renderHook(() => useAuthMutations(), { wrapper });
  result.current.logout.mutate();

  await waitFor(() => expect(result.current.logout.isSuccess).toBe(true));

  expect(queryClient.getQueryData(userPreferencesKeys.current(accountA.id))).toBeUndefined();
  expect(queryClient.getQueryData(userPreferencesKeys.current(accountB.id))).toBeUndefined();
  expect(window.localStorage.getItem(userPreferencesStorageKey)).toBe(localPreferences);
});

test("keeps a late account A preferences response out of account B state", async () => {
  let resolveA!: (value: ReturnType<typeof response>) => void;
  getUserPreferences.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveA = resolve;
    }),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  const accountAResult = renderHook(() => useUserPreferences(1), { wrapper });
  await waitFor(() => expect(getUserPreferences).toHaveBeenCalledTimes(1));
  getUserPreferences.mockResolvedValueOnce({
    data: {
      preferences: {
        ...response("light").data.preferences,
        selectedLanguage: "en",
        wasIntroduced: true,
      },
    },
  });
  const accountBResult = renderHook(() => useUserPreferences(2), { wrapper });
  await waitFor(() => expect(accountBResult.result.current.data?.selectedTheme).toBe("light"));

  resolveA({
    data: {
      preferences: {
        ...response("dark").data.preferences,
        selectedLanguage: "ru",
        wasIntroduced: false,
      },
    },
  });
  await waitFor(() => expect(accountAResult.result.current.data?.selectedTheme).toBe("dark"));

  expect(queryClient.getQueryData(userPreferencesKeys.current(2))).toEqual({
    data: {
      preferences: {
        ...response("light").data.preferences,
        selectedLanguage: "en",
        wasIntroduced: true,
      },
    },
  });
});

test("starts rapid preference updates independently", async () => {
  updateUserPreferences.mockResolvedValue(response("dark"));
  const { queryClient, wrapper } = setup();
  queryClient.setQueryData(userPreferencesKeys.current(accountA.id), response("light"));
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  result.current.mutate({ selectedTheme: "light" });

  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(2));
  expect(queryClient.getQueryData(userPreferencesKeys.current(accountA.id))).toEqual(response("light"));
});

test("aborts an in-flight preference update when the account changes", async () => {
  updateUserPreferences.mockReturnValue(new Promise(() => {}));
  const { queryClient, wrapper } = setup(accountA);
  const { result, rerender } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  const request = updateUserPreferences.mock.calls[0]?.[2];
  expect(request).toBeInstanceOf(AbortSignal);

  queryClient.setQueryData(authKeys.me, { data: { user: accountB } });
  rerender();

  expect(request.aborted).toBe(true);
});

test("ignores a late failure after switching accounts", async () => {
  let rejectRequest!: (error: Error) => void;
  updateUserPreferences.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectRequest = reject;
    }),
  );
  const { queryClient, wrapper } = setup(accountB);
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  queryClient.setQueryData(authKeys.me, { data: { user: accountA } });
  rejectRequest(new Error("offline"));

  await waitFor(() => expect(result.current.isError).toBe(true));
});

test("ignores a late success after switching accounts", async () => {
  let resolveRequest!: (value: ReturnType<typeof response>) => void;
  updateUserPreferences.mockReturnValue(
    new Promise((resolve) => {
      resolveRequest = resolve;
    }),
  );
  const { queryClient, wrapper } = setup();
  queryClient.setQueryData(userPreferencesKeys.current(accountA.id), response("light"));
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  queryClient.setQueryData(authKeys.me, { data: { user: accountB } });
  resolveRequest(response("dark"));

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(queryClient.getQueryData(userPreferencesKeys.current(accountA.id))).toEqual(response("light"));
});

test("ignores a late response after leaving and returning to the same account", async () => {
  let resolveRequest!: (value: ReturnType<typeof response>) => void;
  updateUserPreferences.mockReturnValue(
    new Promise((resolve) => {
      resolveRequest = resolve;
    }),
  );
  const { queryClient, wrapper } = setup();
  queryClient.setQueryData(userPreferencesKeys.current(accountA.id), response("light"));
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  queryClient.setQueryData(authKeys.me, { data: { user: accountB } });
  queryClient.setQueryData(authKeys.me, { data: { user: accountA } });
  resolveRequest(response("dark"));

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(queryClient.getQueryData(userPreferencesKeys.current(accountA.id))).toEqual(response("light"));
});

test("ignores a late failure after leaving and returning to the same account", async () => {
  let rejectRequest!: (error: Error) => void;
  updateUserPreferences.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectRequest = reject;
    }),
  );
  const { queryClient, wrapper } = setup();
  const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper });

  result.current.mutate({ selectedTheme: "dark" });
  await waitFor(() => expect(updateUserPreferences).toHaveBeenCalledTimes(1));
  queryClient.setQueryData(authKeys.me, { data: { user: accountB } });
  queryClient.setQueryData(authKeys.me, { data: { user: accountA } });
  rejectRequest(new Error("offline"));

  await waitFor(() => expect(result.current.isError).toBe(true));
});
