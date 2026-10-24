import { act, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect, test } from "vitest";
import { setSearch, store, toggleStatus } from "../../../store";
import { useCollectionRouteFilters } from "./collection-route-filters.model";

function Projection() {
  useCollectionRouteFilters();
  return null;
}

test("collection URLs project filters and restore them through navigation", async () => {
  const router = createMemoryRouter([{ path: "*", element: <Projection /> }], {
    initialEntries: ["/?q=Northwind&statuses=offer,saved,saved,unknown&keep=yes#results"],
  });
  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  try {
    expect(store.getState().ui.search).toBe("Northwind");
    expect(store.getState().ui.visibleStatuses).toEqual(["saved", "offer"]);
    await act(async () => store.dispatch(setSearch("new query")));
    expect(router.state.location.search).toContain("q=new+query");
    expect(router.state.location.search).toContain("keep=yes");
    expect(router.state.location.hash).toBe("#results");
    await act(async () => store.dispatch(toggleStatus("offer")));
    expect(router.state.location.search).toContain("statuses=saved");
    await act(async () => router.navigate(-1));
    expect(store.getState().ui.visibleStatuses).toEqual(["saved", "offer"]);
    expect(store.getState().ui.search).toBe("new query");
    await act(async () => router.navigate(1));
    expect(store.getState().ui.visibleStatuses).toEqual(["saved"]);
    await act(async () => router.navigate("/archive"));
    expect(store.getState().ui.search).toBe("");
    await act(async () => router.navigate(-1));
    expect(store.getState().ui.search).toBe("new query");
    await act(async () => store.dispatch(setSearch("")));
    expect(new URLSearchParams(router.state.location.search).has("q")).toBe(false);
  } finally {
    view.unmount();
    router.dispose();
  }
});

test("consecutive filter actions preserve the latest query and status selection", async () => {
  const router = createMemoryRouter([{ path: "*", element: <Projection /> }], { initialEntries: ["/"] });
  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  try {
    await act(async () => {
      store.dispatch(setSearch("a"));
      store.dispatch(setSearch("ab"));
      store.dispatch(toggleStatus("offer"));
    });
    expect(new URLSearchParams(router.state.location.search).get("q")).toBe("ab");
    expect(store.getState().ui.search).toBe("ab");
    expect(store.getState().ui.visibleStatuses).not.toContain("offer");
    expect(new URLSearchParams(router.state.location.search).get("statuses")).not.toContain("offer");
  } finally {
    view.unmount();
    router.dispose();
  }
});

test.each([
  ["", ["saved", "applied", "interview", "offer", "rejected", "withdrawn"]],
  ["?statuses=", []],
  ["?statuses=unknown", ["saved", "applied", "interview", "offer", "rejected", "withdrawn"]],
])("interprets status selection %s", (search, expected) => {
  const router = createMemoryRouter([{ path: "*", element: <Projection /> }], { initialEntries: [`/${search}`] });
  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  expect(store.getState().ui.visibleStatuses).toEqual(expected);
  view.unmount();
  router.dispose();
});

test.each(["/archive/?q=archive", "/BLACKLIST?q=archive"])("projects accepted collection route %s", (path) => {
  const router = createMemoryRouter([{ path: "*", element: <Projection /> }], { initialEntries: [path] });
  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  expect(store.getState().ui.search).toBe("archive");
  view.unmount();
  router.dispose();
});

test.each(["/archive?q=archive&keep=new#destination", "/?q=archive&keep=new#destination"])(
  "a filter dispatch cannot replace pending destination %s",
  async (destination) => {
    const router = createMemoryRouter([{ path: "*", element: <Projection /> }], { initialEntries: ["/"] });
    const view = render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>,
    );
    try {
      await act(async () => {
        const navigation = router.navigate(destination);
        store.dispatch(setSearch("stale change"));
        await navigation;
      });
      expect(router.state.location.pathname).toBe(destination.split("?")[0]);
      expect(router.state.location.search).toBe("?q=archive&keep=new");
      expect(router.state.location.hash).toBe("#destination");
      expect(store.getState().ui.search).toBe("archive");
    } finally {
      view.unmount();
      router.dispose();
    }
  },
);
