import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./app-error-boundary";

let shouldThrow = false;

function BrokenPage({ broken }: { broken: boolean }) {
  if (broken || shouldThrow) throw new Error("render failed");
  return <p>Page recovered</p>;
}

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = false;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lets a user retry a transient page render failure", () => {
    shouldThrow = true;
    render(
      <AppErrorBoundary resetKey="/admin/profile">
        <BrokenPage broken={false} />
      </AppErrorBoundary>,
    );

    expect(screen.getByText("This page could not be opened")).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry page" }));
    expect(screen.getByText("Page recovered")).toBeInTheDocument();
  });

  it("clears a page failure when navigation changes the route key", () => {
    const { rerender } = render(
      <AppErrorBoundary resetKey="/admin/profile">
        <BrokenPage broken />
      </AppErrorBoundary>,
    );

    rerender(
      <AppErrorBoundary resetKey="/admin/students">
        <BrokenPage broken={false} />
      </AppErrorBoundary>,
    );
    expect(screen.getByText("Page recovered")).toBeInTheDocument();
  });
});
