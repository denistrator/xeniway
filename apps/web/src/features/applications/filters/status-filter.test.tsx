import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it } from "vitest";
import { setAllStatuses, store } from "../../../store";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { StatusFilter } from "./status-filter.view";

describe("status filter", () => {
  beforeEach(async () => {
    await initializeTestI18n();
    store.dispatch(setAllStatuses(true));
  });

  it("uses a nonmodal named checkbox group and returns focus after Escape", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <StatusFilter />
      </Provider>,
    );

    const trigger = screen.getByRole("button", { name: /Filter statuses/ });
    await user.click(trigger);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filter statuses" })).toBeVisible();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("group", { name: "Filter statuses" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
