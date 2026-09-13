import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFileDownloadUrl } from "../../storage/api/files.api";
import { getInstitutionBranding } from "../api/settings.api";
import {
  publishMemberProfilePhoto,
  useMemberProfilePhoto,
} from "../../session/model/use-member-profile-photo";
import { useInstitutionBranding } from "./use-institution-branding";

vi.mock("../../storage/api/files.api", () => ({ getFileDownloadUrl: vi.fn() }));
vi.mock("../api/settings.api", () => ({ getInstitutionBranding: vi.fn() }));

function BrandingProbe() {
  const branding = useInstitutionBranding("tenant-1");
  const memberPhoto = useMemberProfilePhoto("file-member-1");
  return (
    <>
      <output data-testid="tenant-name">{branding.name}</output>
      <output data-testid="tenant-logo">{branding.logoUrl}</output>
      <output data-testid="member-photo">{memberPhoto}</output>
    </>
  );
}

describe("tenant branding hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getInstitutionBranding).mockResolvedValue({
      name: "Vebgenix School",
      logoFileId: "file-logo-1",
    });
    vi.mocked(getFileDownloadUrl).mockImplementation(async (fileId) =>
      fileId === "file-logo-1"
        ? "https://storage.test/institution.png"
        : "https://storage.test/member.png",
    );
  });

  afterEach(cleanup);

  it("loads the institution logo and current member photo", async () => {
    render(<BrandingProbe />);
    await waitFor(() =>
      expect(screen.getByTestId("tenant-logo")).toHaveTextContent(
        "https://storage.test/institution.png",
      ),
    );
    expect(screen.getByTestId("tenant-name")).toHaveTextContent("Vebgenix School");
    expect(screen.getByTestId("member-photo")).toHaveTextContent("https://storage.test/member.png");
  });

  it("updates the member image immediately after a profile photo change", async () => {
    render(<BrandingProbe />);
    await waitFor(() => expect(screen.getByTestId("member-photo")).toHaveTextContent("member.png"));
    act(() => publishMemberProfilePhoto("https://storage.test/new-member.png"));
    expect(screen.getByTestId("member-photo")).toHaveTextContent("new-member.png");
  });
});
