import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { beforeEach, expect, test, vi } from "vitest";
import { i18n } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";
import { readLocalUserPreferences } from "../../lib/user-preferences";
import { setTheme, store } from "../../store";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { useCanMutate } from "../offline/offline-access.ts";
import { useSettingsPreferences } from "./settings-preferences.ts";

vi.mock("../../lib/queries", () => ({ useCurrentUser: vi.fn(), useUpdateUserPreferences: vi.fn() }));
vi.mock("../offline/offline-access.ts", () => ({ useCanMutate: vi.fn() }));

const mutate = vi.fn();

function Wrapper({ children }: PropsWithChildren) {
  return <Provider store={store}>{children}</Provider>;
}

beforeEach(async () => {
  await initializeTestI18n();
  store.dispatch(setTheme("system"));
  mutate.mockClear();
  vi.mocked(useCurrentUser).mockReturnValue({ data: { id: 1 } } as never);
  vi.mocked(useUpdateUserPreferences).mockReturnValue({ mutate } as never);
  vi.mocked(useCanMutate).mockReturnValue(true);
});

test("updates theme locally and saves explicit authenticated selections", () => {
  const { result } = renderHook(useSettingsPreferences, { wrapper: Wrapper });
  act(() => result.current.theme.onValueChange("dark"));
  expect(result.current.theme.value).toBe("dark");
  expect(readLocalUserPreferences().theme).toBe("dark");
  expect(mutate).toHaveBeenCalledWith({ selectedTheme: "dark" });
});

test.each(["signed-out", "offline"])("keeps preferences locally usable when %s", async (state) => {
  if (state === "signed-out") {
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as never);
  } else {
    vi.mocked(useCanMutate).mockReturnValue(false);
  }
  const { result } = renderHook(useSettingsPreferences, { wrapper: Wrapper });
  act(() => result.current.theme.onValueChange("light"));
  await act(async () => {
    result.current.language.onValueChange("he");
    await vi.waitFor(() => expect(i18n.resolvedLanguage).toBe("he"));
  });
  expect(result.current.dir).toBe("rtl");
  expect(readLocalUserPreferences()).toMatchObject({ theme: "light", language: "he" });
  expect(mutate).not.toHaveBeenCalled();
});

test("ignores values outside the supported preference options", () => {
  const { result } = renderHook(useSettingsPreferences, { wrapper: Wrapper });
  act(() => {
    result.current.theme.onValueChange("invalid");
    result.current.language.onValueChange("invalid");
  });
  expect(result.current.theme.value).toBe("system");
  expect(result.current.language.value).toBe("en");
  expect(mutate).not.toHaveBeenCalled();
});
