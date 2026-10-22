import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { authKeys } from "../../../lib/queries";
import { setJobFormPresentation, store } from "../../../store";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { JobManager } from "./job-manager.view";

beforeEach(async () => {
  await initializeTestI18n();
  store.dispatch(setJobFormPresentation("drawer"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("keeps an offline presentation choice local without silently uploading on reconnect", async () => {
  let online = false;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1 } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <JobManager open submitting={false} onSave={() => false} onClose={() => {}} />
      </QueryClientProvider>
    </Provider>,
  );

  await user.click(screen.getByRole("button", { name: "Switch to modal" }));
  expect(store.getState().ui.jobFormPresentation).toBe("modal");
  expect(
    within(screen.getByRole("dialog")).getByText("Applied on this device. Not saved to your account."),
  ).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
  online = true;
  window.dispatchEvent(new Event("online"));
  expect(fetchMock).not.toHaveBeenCalled();
  client.clear();
});

test("keeps a create-application draft when switching between drawer and modal", async () => {
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 })));

  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <JobManager open submitting={false} onSave={() => false} onClose={() => {}} />
      </QueryClientProvider>
    </Provider>,
  );

  await user.type(screen.getByLabelText(/Company/), "Northwind");
  await user.click(screen.getByRole("button", { name: "Switch to modal" }));

  expect(screen.getByLabelText(/Company/)).toHaveValue("Northwind");
  client.clear();
});

test("announces a failed create inside the active dialog", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <JobManager
          open
          submitting={false}
          submitError="Something went wrong. Please try again."
          onSave={() => false}
          onClose={() => {}}
        />
      </QueryClientProvider>
    </Provider>,
  );

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  client.clear();
});

test("contains focus and handles Escape once in the create dialog", async () => {
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <JobManager open submitting={false} onSave={() => false} onClose={onClose} />
      </QueryClientProvider>
    </Provider>,
  );

  const dialog = screen.getByRole("dialog");
  const close = within(dialog).getByRole("button", { name: "Close" });
  expect(close).toHaveFocus();

  for (let count = 0; count < 15; count += 1) {
    await user.tab();
  }
  expect(dialog.contains(document.activeElement)).toBe(true);

  await user.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(1);
  client.clear();
});

test("keeps a create draft until the user explicitly discards it", async () => {
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <JobManager open submitting={false} onSave={() => false} onClose={onClose} />
      </QueryClientProvider>
    </Provider>,
  );

  await user.type(screen.getByLabelText(/Company/), "Northwind");
  await user.click(screen.getByRole("button", { name: "Close" }));

  const warning = await screen.findByRole("alertdialog");
  await user.click(within(warning).getByRole("button", { name: "Keep editing" }));

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText(/Company/)).toHaveValue("Northwind");

  await user.click(screen.getByRole("button", { name: "Close" }));
  await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText(/Company/)).toHaveValue("");
  client.clear();
});

test("retains the draft after a failed save request from the close warning", async () => {
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSave = vi.fn().mockResolvedValue(false);
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <JobManager open submitting={false} onSave={onSave} onClose={() => {}} />
      </QueryClientProvider>
    </Provider>,
  );

  await user.type(screen.getByLabelText(/Company/), "Northwind");
  await user.type(screen.getByLabelText(/Position/), "Engineer");
  await user.click(screen.getByRole("button", { name: "Close" }));
  await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Save changes" }));

  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ company: "Northwind", position: "Engineer" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Company/)).toHaveValue("Northwind");
  client.clear();
});
