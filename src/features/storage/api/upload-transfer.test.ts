import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadTransfer } from "./upload-transfer";

afterEach(() => vi.unstubAllGlobals());
function setup() {
  const xhr = {
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    abort: vi.fn(),
    status: 200,
    upload: { onprogress: null as ((event: ProgressEvent) => void) | null },
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  vi.stubGlobal(
    "XMLHttpRequest",
    vi.fn(() => xhr),
  );
  return xhr;
}
const file = new File(["photo"], "photo.png", { type: "image/png" });
describe("uploadTransfer", () => {
  it("reports transferred bytes and waits for successful HTTP completion", async () => {
    const xhr = setup();
    const progress = vi.fn();
    const transfer = uploadTransfer(
      "https://storage.test/upload",
      file,
      { "content-type": "image/png" },
      new AbortController().signal,
      progress,
    );
    xhr.upload.onprogress?.(
      new ProgressEvent("progress", { lengthComputable: true, loaded: 5, total: 10 }),
    );
    expect(progress).toHaveBeenCalledWith(50);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith("content-type", "image/png");
    expect(xhr.send).toHaveBeenCalledWith(file);
    xhr.onload?.();
    await expect(transfer).resolves.toBeUndefined();
  });
  it("aborts the network transfer when the user cancels", async () => {
    const xhr = setup();
    const controller = new AbortController();
    const transfer = uploadTransfer(
      "https://storage.test/upload",
      file,
      {},
      controller.signal,
      vi.fn(),
    );
    controller.abort();
    await expect(transfer).rejects.toMatchObject({ name: "AbortError" });
    expect(xhr.abort).toHaveBeenCalledOnce();
  });
  it("rejects an unsuccessful upload response", async () => {
    const xhr = setup();
    const transfer = uploadTransfer(
      "https://storage.test/upload",
      file,
      {},
      new AbortController().signal,
      vi.fn(),
    );
    xhr.status = 403;
    xhr.onload?.();
    await expect(transfer).rejects.toThrow("status 403");
  });
});
