import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TenantList } from "./tenant-list";

describe("TenantList", () => {
  it("renders tenant identity, status, and an accessible detail link", () => {
    const view = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TenantList
          tenants={[{
            id: "tenant-1",
            name: "Northstar College",
            organizationName: "Northstar College",
            slug: "northstar-college",
            type: "COLLEGE",
            status: "ACTIVE",
            contactEmail: "admin@northstar.test",
            createdAt: "2026-07-14T00:00:00.000Z",
            updatedAt: "2026-07-14T00:00:00.000Z",
          }]}
        />
      </MemoryRouter>,
    );
    expect(view.getByText("Northstar College")).toBeInTheDocument();
    expect(view.getByText("ACTIVE")).toBeInTheDocument();
    expect(view.getByRole("link", { name: "Open Northstar College" })).toHaveAttribute("href", "/platform/tenants/tenant-1");
  });
});
