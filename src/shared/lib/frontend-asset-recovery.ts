const recoveryWindowMs = 60_000;
const recoveryPrefix = "vebgenix.asset-recovery";

export function isAssetLoadFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed|Unable to preload CSS/i.test(
    message,
  );
}

export function recoverFromAssetLoadFailure(
  error: unknown,
  options: {
    path?: string;
    now?: number;
    storage?: Pick<Storage, "getItem" | "setItem">;
    reload?: () => void;
  } = {},
): boolean {
  if (!isAssetLoadFailure(error) || typeof window === "undefined") return false;

  const path = options.path ?? window.location.pathname;
  const now = options.now ?? Date.now();
  const storage = options.storage ?? window.sessionStorage;
  const key = `${recoveryPrefix}:${path}`;
  const previousAttempt = Number(storage.getItem(key) ?? 0);
  if (previousAttempt > 0 && now - previousAttempt < recoveryWindowMs) return false;

  storage.setItem(key, String(now));
  (options.reload ?? (() => window.location.reload()))();
  return true;
}
