import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authKeys } from "../../../lib/queries";
import { setJobFormPresentation, store } from "../../../store";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { JobManager } from "./job-manager.view";

function renderJobForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });

  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <JobManager open submitting={false} onSave={() => {}} onClose={() => {}} />
      </QueryClientProvider>
    </Provider>,
  );

  return client;
}

function submitApplication() {
  const submitButton = screen.getByRole("button", { name: "Save application" });
  const form = submitButton.closest("form");

  if (!form) {
    throw new Error("Application form was not rendered.");
  }

  fireEvent.submit(form);
}

describe("job form", () => {
  beforeEach(async () => {
    await initializeTestI18n();
    store.dispatch(setJobFormPresentation("drawer"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("identifies whitespace-only required values and focuses the first correction", async () => {
    const user = userEvent.setup();
    const client = renderJobForm();
    const company = screen.getByLabelText(/Company/);
    const position = screen.getByLabelText(/Position/);

    await user.type(company, "   ");
    await user.type(position, "   ");
    submitApplication();

    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    expect(company).toHaveAttribute("aria-invalid", "true");
    expect(position).toHaveAttribute("aria-invalid", "true");
    expect(company).toHaveFocus();
    client.clear();
  });

  it("associates over-limit and URL errors with their controls and clears stale feedback", async () => {
    const user = userEvent.setup();
    const client = renderJobForm();
    const company = screen.getByLabelText(/Company/);
    const position = screen.getByLabelText(/Position/);
    const location = screen.getByLabelText(/Location/);
    const jobUrl = screen.getByLabelText(/Job URL/);

    await user.type(company, "Northwind");
    await user.type(position, "Engineer");
    fireEvent.change(location, { target: { value: "l".repeat(501) } });
    fireEvent.change(jobUrl, { target: { value: "not a URL" } });
    expect(company).toBeRequired();
    expect(jobUrl).toHaveAttribute("type", "url");
    expect(jobUrl).toBeInvalid();
    submitApplication();

    expect(await screen.findByText("Use 500 characters or fewer.")).toBeVisible();
    expect(await screen.findByText("Enter a valid URL.")).toBeVisible();
    expect(location).toHaveAttribute("aria-describedby", "job-location-error");
    expect(jobUrl).toHaveAttribute("aria-describedby", "job-jobUrl-error");
    expect(location).toHaveFocus();

    await user.clear(location);
    await user.type(location, "Kyiv");

    expect(location).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Use 500 characters or fewer.")).not.toBeInTheDocument();
    client.clear();
  });
});
