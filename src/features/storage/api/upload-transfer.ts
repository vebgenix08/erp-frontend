/** XHR exposes actual transfer progress, which fetch does not provide. */
export function uploadTransfer(
  url: string,
  file: File,
  headers: Record<string, string>,
  signal: AbortSignal,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const xhr = new XMLHttpRequest();
    const cleanup = () => signal.removeEventListener("abort", abort);
    const abort = () => {
      xhr.abort();
      cleanup();
      reject(signal.reason);
    };
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Upload failed. Check your connection and try again."));
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      xhr.send(file);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
