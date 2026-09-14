import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadFile } from "./files.api";
import { resetRequestSession } from "../../../shared/api/request-coordinator";

describe("file upload integrity", () => {
  beforeEach(() => {
    sessionStorage.setItem("erp.cognito.idToken", "test-token");
  });
  afterEach(() => {
    resetRequestSession();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });
  it("sends metadata once, uploads bytes and only then completes the file", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url, init) => {
        calls.push({ url: String(url), body: init?.body });
        if (String(url).endsWith("/upload-url"))
          return new Response(
            JSON.stringify({
              file: { id: "file-1" },
              uploadUrl: "https://storage.test/upload",
              headers: { "content-type": "image/png" },
            }),
            { headers: { "content-type": "application/json" } },
          );
        if (String(url) === "https://storage.test/upload")
          return new Response(null, { status: 200 });
        return new Response(JSON.stringify({ id: "file-1", status: "AVAILABLE" }), {
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const file = new File(["photo"], "photo.png", { type: "image/png" });
    await expect(uploadFile({ file, scopeType: "TENANT" })).resolves.toMatchObject({
      status: "AVAILABLE",
    });
    expect(JSON.parse(String(calls[0]?.body))).toMatchObject({
      fileName: "photo.png",
      sizeBytes: 5,
    });
    expect(calls[1]?.body).toBe(file);
    expect(calls[2]?.url).toContain("/files/file-1/complete-upload");
  });
  it("does not confirm an unsuccessful byte upload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ file: { id: "file-1" }, uploadUrl: "https://storage.test/upload" }),
          { headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      uploadFile({ file: new File(["photo"], "photo.png"), scopeType: "TENANT" }),
    ).rejects.toThrow("Upload failed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
