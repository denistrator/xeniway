import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { UserPreferences } from "@xeniway/shared";
import { type PropsWithChildren, StrictMode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale, i18n } from "../../i18n/i18n";
import he from "../../i18n/locales/he";
import { userPreferencesKeys } from "../../lib/api";
import { authKeys } from "../../lib/queries";
import { readLocalUserPreferences, writeLocalUserPreferences } from "../../lib/user-preferences";
import { setJobFormPresentation, setTheme, store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { useUserPreferencesSync } from "./user-preferences-sync.model";

const fetchDictionary = vi.fn<typeof fetch>();
const serverPreferences: UserPreferences = {
  selectedLanguage: "he",
  selectedTheme: "light",
  selectedFormPresentation: "modal",
  wasIntroduced: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
let client: QueryClient;

beforeEach(async () => {
  await initializeTestI18n();
  i18n.removeResourceBundle("he", "translation");
  writeLocalUserPreferences({ theme: "system", formPresentation: "drawer", wasIntroduced: false });
  store.dispatch(setTheme("system"));
  store.dispatch(setJobFormPresentation("drawer"));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1 } } });
  client.setQueryData(userPreferencesKeys.current(1), { data: { preferences: serverPreferences } });
  fetchDictionary.mockReset();
  vi.stubGlobal("fetch", fetchDictionary);
});

afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

function Wrapper({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </Provider>
  );
}

test("account dictionary failure preserves unrelated hydrated fields and performs no preference upload", async () => {
  fetchDictionary.mockRejectedValue(new TypeError("resource unavailable"));
  renderHook(useUserPreferencesSync, { wrapper: Wrapper });
  await waitFor(() => expect(fetchDictionary).toHaveBeenCalledOnce());
  const resourceUrl = new URL(String(fetchDictionary.mock.calls[0][0]));
  expect(resourceUrl.pathname).toMatch(/\/he(?:-[\w-]+)?\.json$/);
  expect(readLocalUserPreferences()).toMatchObject({ theme: "light", formPresentation: "modal", wasIntroduced: true });
  expect(store.getState().ui.theme).toBe("light");
  expect(store.getState().ui.jobFormPresentation).toBe("modal");
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
});

function deferDictionary() {
  let complete!: (response: Response) => void;
  fetchDictionary.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  return () => complete(new Response(JSON.stringify(he), { headers: { "content-type": "application/json" } }));
}

function StrictWrapper({ children }: PropsWithChildren) {
  return (
    <StrictMode>
      <Wrapper>{children}</Wrapper>
    </StrictMode>
  );
}

test("StrictMode hydration shares one public download and applies the current account locale", async () => {
  const complete = deferDictionary();
  renderHook(useUserPreferencesSync, { wrapper: StrictWrapper });
  await waitFor(() => expect(fetchDictionary).toHaveBeenCalledOnce());
  await act(async () => complete());
  await waitFor(() => expect(i18n.resolvedLanguage).toBe("he"));
  expect(fetchDictionary).toHaveBeenCalledOnce();
  expect(document.documentElement.lang).toBe("he");
  expect(document.documentElement.dir).toBe("rtl");
  expect(readLocalUserPreferences().language).toBe("he");
});

test("late account dictionary completion cannot activate after the owner changes", async () => {
  const complete = deferDictionary();
  renderHook(useUserPreferencesSync, { wrapper: Wrapper });
  await waitFor(() => expect(fetchDictionary).toHaveBeenCalledOnce());
  await act(async () => {
    client.setQueryData(userPreferencesKeys.current(2), {
      data: { preferences: { ...serverPreferences, selectedLanguage: null } },
    });
    client.setQueryData(authKeys.me, { data: { user: { id: 2 } } });
  });
  await act(async () => complete());
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("en");
});

test("a pending account dictionary cannot overwrite a newer explicit language choice", async () => {
  const complete = deferDictionary();
  renderHook(useUserPreferencesSync, { wrapper: Wrapper });
  await waitFor(() => expect(fetchDictionary).toHaveBeenCalledOnce());
  await act(async () => {
    await changeLocale("en");
  });
  await act(async () => complete());
  expect(i18n.resolvedLanguage).toBe("en");
  expect(readLocalUserPreferences().language).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
});
