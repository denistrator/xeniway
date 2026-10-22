import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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
        <JobManager open submitting={false} onSave={() => {}} onClose={() => {}} />
      </QueryClientProvider>
    </Provider>,
  );

  await user.type(screen.getByLabelText(/Company/), "Northwind");
  await user.click(screen.getByRole("button", { name: "Switch to modal" }));

  expect(screen.getByLabelText(/Company/)).toHaveValue("Northwind");
  client.clear();
});
