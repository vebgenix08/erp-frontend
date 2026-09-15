import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFileDownloadUrl, uploadFile } from "../../storage/api/files.api";
import { getInstitutionProfile, saveInstitutionProfile } from "../api/settings.api";
import {
  subscribeToInstitutionBranding,
  type InstitutionBrandingUpdate,
} from "../model/institution-branding";
import { InstitutionProfileSettings } from "./institution-profile";

vi.mock("../../storage/api/files.api", () => ({
  uploadFile: vi.fn(),
  getFileDownloadUrl: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("../api/settings.api", () => ({
  getInstitutionProfile: vi.fn(),
  saveInstitutionProfile: vi.fn(),
}));

describe("institution profile branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:institution-logo-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.mocked(getInstitutionProfile).mockResolvedValue({
      id: "institution-1",
      tenantId: "tenant-1",
      name: "Vebgenix School",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.mocked(uploadFile).mockResolvedValue({
      id: "file-logo-1",
      fileName: "school-logo.png",
      contentType: "image/png",
      status: "AVAILABLE",
      scopeType: "TENANT",
    });
    vi.mocked(saveInstitutionProfile).mockResolvedValue({
      id: "institution-1",
      tenantId: "tenant-1",
      name: "Vebgenix School",
      logoFileId: "file-logo-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:01:00.000Z",
    });
    vi.mocked(getFileDownloadUrl).mockResolvedValue("https://storage.test/school-logo.png");
  });

  afterEach(cleanup);

  it("previews a new logo and publishes it to the surrounding tenant layout", async () => {
    const updates: InstitutionBrandingUpdate[] = [];
    const unsubscribe = subscribeToInstitutionBranding((update) => updates.push(update));
    const view = render(<InstitutionProfileSettings />);
    expect(await screen.findByRole("heading", { name: "Institution Profile" })).toBeInTheDocument();

    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    const logo = new File(["logo"], "school-logo.png", { type: "image/png" });
    fireEvent.change(input!, { target: { files: [logo] } });

    await waitFor(() =>
      expect(uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          file: logo,
          scopeType: "TENANT",
          metadata: { category: "institution_logo" },
        }),
      ),
    );
    expect(saveInstitutionProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Vebgenix School", logoFileId: "file-logo-1" }),
    );
    expect(await screen.findByText(/saved and applied across the workspace/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("img", { name: "Vebgenix School logo" })
        .every((image) => image.getAttribute("src")?.includes("storage.test/school-logo.png")),
    ).toBe(true);
    expect(updates.at(-1)).toEqual({
      name: "Vebgenix School",
      logoUrl: "https://storage.test/school-logo.png",
    });
    unsubscribe();
  });

  it("validates required details from the header save button", async () => {
    render(<InstitutionProfileSettings />);
    const name = await screen.findByLabelText(/Official Institution Name/);
    fireEvent.change(name, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(saveInstitutionProfile).not.toHaveBeenCalled();
    expect(name).toBeInvalid();
  });

  it("shows transfer progress and cancels without attaching a logo", async () => {
    vi.mocked(uploadFile).mockImplementation(
      ({ signal, onProgress }) =>
        new Promise((_resolve, reject) => {
          onProgress?.(45);
          signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    const view = render(<InstitutionProfileSettings />);
    await screen.findByRole("heading", { name: "Institution Profile" });
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["logo"], "logo.png", { type: "image/png" })] },
    });
    expect(await screen.findByText("45% uploaded")).toBeInTheDocument();
    expect(screen.getByLabelText(/Official Institution Name/)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel upload" }));
    expect(await screen.findByText(/Logo upload cancelled/)).toBeInTheDocument();
    expect(saveInstitutionProfile).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Official Institution Name/)).not.toBeDisabled();
  });
});
