import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, Link, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { UnsavedChangesProvider, useUnsavedChanges } from "./unsaved-changes";

afterEach(cleanup);

function Layout() {
  return (
    <UnsavedChangesProvider>
      <Outlet />
    </UnsavedChangesProvider>
  );
}

function EditPage({ dirty = true }: { dirty?: boolean }) {
  useUnsavedChanges("test-form", dirty);
  const location = useLocation();
  return (
    <main>
      <output>{location.pathname}</output>
      <Link to="/next">Go to next page</Link>
    </main>
  );
}

function renderRouter(element = <EditPage />) {
  const router = createMemoryRouter(
    [
      {
        element: <Layout />,
        children: [
          { path: "/edit", element },
          { path: "/next", element: <h1>Next page</h1> },
        ],
      },
    ],
    { initialEntries: ["/edit"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("unsaved changes guard", () => {
  it("blocks app navigation until the user explicitly discards edits", async () => {
    const router = renderRouter();
    fireEvent.click(screen.getByRole("link", { name: "Go to next page" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("Discard unsaved changes?");
    expect(router.state.location.pathname).toBe("/edit");
    fireEvent.click(screen.getByRole("button", { name: "Stay here" }));
    expect(router.state.location.pathname).toBe("/edit");

    fireEvent.click(screen.getByRole("link", { name: "Go to next page" }));
    fireEvent.click(await screen.findByRole("button", { name: "Discard changes" }));
    expect(await screen.findByRole("heading", { name: "Next page" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/next");
  });

  it("registers the browser refresh and close warning only while dirty", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    renderRouter();
    expect(addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function), undefined);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("uses the same confirmation when closing a dirty editor", async () => {
    function Editor() {
      const { requestDiscard } = useUnsavedChanges("editor", true);
      return (
        <button
          onClick={() => requestDiscard(() => document.body.setAttribute("data-closed", "true"))}
        >
          Close editor
        </button>
      );
    }
    renderRouter(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Close editor" }));
    fireEvent.click(await screen.findByRole("button", { name: "Discard changes" }));
    expect(document.body).toHaveAttribute("data-closed", "true");
    document.body.removeAttribute("data-closed");
  });
});
