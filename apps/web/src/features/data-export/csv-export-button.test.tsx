import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setAuthenticatedRequestGuard } from "../../lib/api";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { CsvExportButton } from "./csv-export-button.tsx";

let client: QueryClient;
let downloads: { filename: string; href: string; hidden: boolean }[];
const createUrl = vi.fn((_blob: Blob) => "blob:test-export");
const revokeUrl = vi.fn((_url: string) => {});

beforeEach(async () => {
  await initializeTestI18n();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(["auth", "me"], {
    data: { user: { id: 1, email: "owner@example.com", firstName: null, lastName: null } },
  });
  downloads = [];
  createUrl.mockClear();
  revokeUrl.mockClear();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ filename: this.download, href: this.href, hidden: Boolean(this.hidden) });
  });
});

afterEach(() => {
  client.clear();
  setAuthenticatedRequestGuard(null);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderButton() {
  return render(
    <QueryClientProvider client={client}>
      <CsvExportButton />
    </QueryClientProvider>,
  );
}

function pendingExport() {
  let resolve: (response: Response) => void = () => {};
  const response = new Promise<Response>((complete) => {
    resolve = complete;
  });
  const fetch = vi.fn(() => response);
  vi.stubGlobal("fetch", fetch);
  return { fetch, resolve };
}

function zipResponse() {
  return new Response(new Uint8Array([80, 75, 3, 4]), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="xenia-way-export-2026-10-07.zip"',
    },
  });
}

test("prevents duplicate clicks while pending and delivers a named download", async () => {
  const user = userEvent.setup();
  const pending = pendingExport();
  renderButton();
  await user.click(screen.getByRole("button", { name: "Export package" }));
  const busy = await screen.findByRole("button", { name: "Exporting…" });
  expect(busy).toBeDisabled();
  await user.click(busy);
  expect(pending.fetch).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve(zipResponse()));
  await waitFor(() =>
    expect(downloads).toEqual([
      { filename: "xenia-way-export-2026-10-07.zip", href: "blob:test-export", hidden: true },
    ]),
  );
  const blob = createUrl.mock.calls[0][0];
  expect(blob.type).toBe("application/zip");
  expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([80, 75, 3, 4]));
  expect(document.querySelector("a[download]")).toBeNull();
  expect(screen.getByRole("button", { name: "Export package" })).toBeEnabled();
  await waitFor(() => expect(revokeUrl).toHaveBeenCalledWith("blob:test-export"), { timeout: 2000 });
});

test("announces failure and permits a successful retry", async () => {
  const user = userEvent.setup();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("Server error", { status: 500 }))
    .mockResolvedValueOnce(zipResponse());
  vi.stubGlobal("fetch", fetch);
  renderButton();
  await user.click(screen.getByRole("button", { name: "Export package" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Export package failed. Please try again.");
  expect(downloads).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Export package" }));
  await waitFor(() => expect(downloads).toHaveLength(1));
  expect(screen.queryByRole("alert")).toBeNull();
});

test.each([null, 2])(
  "does not deliver a previous owner's pending export after the account becomes %s",
  async (nextId) => {
    const user = userEvent.setup();
    const pending = pendingExport();
    renderButton();
    await user.click(screen.getByRole("button", { name: "Export package" }));
    await screen.findByRole("button", { name: "Exporting…" });
    await act(async () => {
      const nextUser =
        nextId === null ? null : { id: nextId, email: "other@example.com", firstName: null, lastName: null };
      client.setQueryData(["auth", "me"], { data: { user: nextUser } });
      pending.resolve(zipResponse());
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Export package" })).toBeEnabled());
    expect(downloads).toEqual([]);
    expect(createUrl).not.toHaveBeenCalled();
  },
);

test("does not start a download while offline", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  renderButton();
  const button = screen.getByRole("button", { name: "Export package" });
  expect(button).toBeDisabled();
  await userEvent.setup().click(button);
  expect(fetch).not.toHaveBeenCalled();
});
