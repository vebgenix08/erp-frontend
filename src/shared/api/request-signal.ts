export interface RequestSignal {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
}

export function createRequestSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal,
): RequestSignal {
  const controller = new AbortController();
  let timedOut = false;

  const forwardExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) forwardExternalAbort();
  else externalSignal?.addEventListener("abort", forwardExternalAbort, { once: true });

  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      window.clearTimeout(timer);
      externalSignal?.removeEventListener("abort", forwardExternalAbort);
    },
  };
}
