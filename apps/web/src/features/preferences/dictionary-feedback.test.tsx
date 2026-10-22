import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale, i18n, initializeI18n } from "../../i18n/i18n";
import he from "../../i18n/locales/he";
import { authKeys } from "../../lib/queries";
import { readLocalUserPreferences, writeLocalUserPreferences } from "../../lib/user-preferences";
import { store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { LanguageSelector } from "./language-selector.view";
import { SettingsPreferences } from "./settings-preferences.view";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
const fetchDictionary = vi.fn<typeof fetch>();
vi.mock("../../lib/api", async (original) => ({
  ...(await original<typeof import("../../lib/api")>()),
  updateUserPreferences: save,
}));
let client: QueryClient;

beforeEach(async () => {
  fetchDictionary.mockReset();
  fetchDictionary.mockImplementation(
    async () =>
      new Response(JSON.stringify(he), {
        headers: { "content-type": "application/json" },
      }),
  );
  save.mockReset();
  await initializeTestI18n();
  vi.stubGlobal("fetch", fetchDictionary);
  i18n.removeResourceBundle("he", "translation");
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1 } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
});

afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderSelectors() {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <LanguageSelector />
        <SettingsPreferences />
      </QueryClientProvider>
    </Provider>,
  );
}

test("a rejected language stays unapplied, announces sanitized feedback, and can be retried explicitly", async () => {
  fetchDictionary.mockImplementation(async () => {
    throw new Error("secret CDN address");
  });
  const user = userEvent.setup();
  renderSelectors();
  await user.click(screen.getByRole("button", { name: "Language: English. Change language" }));
  await user.click(screen.getByRole("menuitemradio", { name: "Hebrew" }));
  const retries = await screen.findAllByRole("button", { name: "Retry language download" });
  expect(retries).toHaveLength(2);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Language: English. Change language" })).toHaveFocus();
  expect(i18n.resolvedLanguage).toBe("en");
  expect(document.documentElement.lang).toBe("en");
  expect(document.documentElement.dir).toBe("ltr");
  expect(readLocalUserPreferences().language).toBe("en");
  expect(save).not.toHaveBeenCalled();
  expect(document.body).not.toHaveTextContent("secret CDN");
  expect(document.body).not.toHaveTextContent("Applied on this device");
  fetchDictionary.mockImplementation(
    async () =>
      new Response(JSON.stringify(he), {
        headers: { "content-type": "application/json" },
      }),
  );
  save.mockResolvedValue({ data: { preferences: {} } });
  await user.click(retries[1]);
  await waitFor(() => expect(i18n.resolvedLanguage).toBe("he"));
  expect(document.documentElement.lang).toBe("he");
  expect(document.documentElement.dir).toBe("rtl");
  expect(save.mock.calls[0][0]).toEqual({ selectedLanguage: "he" });
  expect(
    screen.queryByRole("button", {
      name: i18n.t("settings.preferences.retryDictionary"),
    }),
  ).not.toBeInTheDocument();
});

test("startup fallback retains the stored language and reconnect does not retry or upload it", async () => {
  let online = false;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
  writeLocalUserPreferences({ language: "he" });
  fetchDictionary.mockImplementation(async () => {
    throw new Error("resource missing");
  });
  await initializeI18n();
  renderSelectors();
  expect(screen.getAllByRole("button", { name: "Retry language download" })).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Language: English. Change language" })).toBeVisible();
  expect(readLocalUserPreferences().language).toBe("he");
  const attempts = fetchDictionary.mock.calls.length;
  fetchDictionary.mockClear();
  online = true;
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(fetchDictionary).not.toHaveBeenCalled();
  expect(attempts).toBeGreaterThan(0);
  expect(save).not.toHaveBeenCalled();
});

test("a dictionary retry from a previous owner is removed on account change", async () => {
  fetchDictionary.mockImplementation(async () => {
    throw new Error("unavailable");
  });
  const user = userEvent.setup();
  renderSelectors();
  await user.click(screen.getByRole("button", { name: "Language: English. Change language" }));
  await user.click(screen.getByRole("menuitemradio", { name: "Hebrew" }));
  await screen.findAllByRole("button", { name: "Retry language download" });
  await act(async () => client.setQueryData(authKeys.me, { data: { user: { id: 2 } } }));
  expect(screen.queryByRole("button", { name: "Retry language download" })).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

test("an account failure remains visible beside a standalone language selector", async () => {
  save.mockRejectedValue(new Error("private account error"));
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <LanguageSelector />
      </QueryClientProvider>
    </Provider>,
  );
  await user.click(screen.getByRole("button", { name: "Language: English. Change language" }));
  await user.click(screen.getByRole("menuitemradio", { name: "Ukrainian" }));
  await waitFor(() => expect(i18n.resolvedLanguage).toBe("uk"));
  expect(
    await screen.findByRole("button", {
      name: i18n.t("settings.preferences.retryAccount"),
    }),
  ).toBeVisible();
  expect(document.body).not.toHaveTextContent("private account error");
});

test("reports a resource failure in the current locale while preserving its language and direction", async () => {
  await changeLocale("ru");
  const translatedFailure = "Не удалось загрузить выбранный язык.";
  i18n.addResource("ru", "translation", "settings.preferences.dictionaryFailed", translatedFailure);
  fetchDictionary.mockImplementation(async () => {
    throw new Error("private resource details");
  });
  const user = userEvent.setup();
  renderSelectors();
  await user.click(screen.getByRole("button", { name: "Язык: Русский. Изменить язык" }));
  await user.click(screen.getByRole("menuitemradio", { name: "Иврит" }));
  await waitFor(() => expect(screen.getAllByText(translatedFailure)).toHaveLength(2));
  expect(i18n.resolvedLanguage).toBe("ru");
  expect(document.documentElement.lang).toBe("ru");
  expect(document.documentElement.dir).toBe("ltr");
  expect(save).not.toHaveBeenCalled();
  i18n.removeResourceBundle("ru", "translation");
});
