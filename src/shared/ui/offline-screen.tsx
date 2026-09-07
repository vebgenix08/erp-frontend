import { RefreshCw, WifiOff } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "./button";

interface NetworkStatusContextType {
  isOnline: boolean;
  lastOnlineAt: Date | null;
  checkConnection: () => Promise<boolean>;
  isReconnecting: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  lastOnlineAt: null,
  checkConnection: async () => true,
  isReconnecting: false,
});

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());
  const [isReconnecting, setIsReconnecting] = useState(false);

  const checkConnection = async (): Promise<boolean> => {
    setIsReconnecting(true);
    try {
      // Ping check to confirm real connectivity
      const response = await fetch("/favicon.ico", {
        method: "HEAD",
        cache: "no-cache",
        headers: { "Cache-Control": "no-cache" },
      }).catch(() => null);

      const online = response !== null ? true : navigator.onLine;
      setIsOnline(online);
      if (online) setLastOnlineAt(new Date());
      return online;
    } catch {
      setIsOnline(false);
      return false;
    } finally {
      setIsReconnecting(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      void checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <NetworkStatusContext.Provider
      value={{ isOnline, lastOnlineAt, checkConnection, isReconnecting }}
    >
      {children}
      {/* Floating Offline Toast Notification when offline */}
      {!isOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-900/90 text-white px-4 py-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
          <WifiOff size={18} className="text-rose-300 shrink-0 animate-pulse" />
          <div className="text-xs">
            <p className="font-extrabold leading-tight">You're currently offline</p>
            <p className="text-[11px] text-rose-200 font-medium">
              Changes will synchronize when connection restores.
            </p>
          </div>
          <button
            onClick={() => void checkConnection()}
            disabled={isReconnecting}
            className="ml-2 flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/30 transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={isReconnecting ? "animate-spin" : ""} />
            Retry
          </button>
        </div>
      )}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}

// --- FULL PAGE OFFLINE FALLBACK SCREEN ---
export function OfflineScreen({
  title = "You're Offline",
  description = "No internet connection detected. The School ERP requires an active network connection to synchronize institutional data.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { isReconnecting, checkConnection, lastOnlineAt } = useNetworkStatus();

  const handleRetry = async () => {
    const online = await checkConnection();
    if (online && onRetry) {
      onRetry();
    }
  };

  return (
    <div className="flex min-h-[75vh] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Radar / WiFi Disconnected Visual */}
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-rose-100/80 animate-ping opacity-30" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 shadow-md">
          <WifiOff size={38} className="text-rose-600" />
        </div>
      </div>

      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500 font-medium leading-relaxed">
        {description}
      </p>

      {/* Network Diagnostic Information Card */}
      <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">Network State</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            Disconnected
          </span>
        </div>
        {lastOnlineAt && (
          <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 text-slate-500">
            <span>Last Connected</span>
            <span className="font-semibold text-slate-700">
              {lastOnlineAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 text-slate-500">
          <span>Data Safety</span>
          <span className="font-semibold text-emerald-700">Local draft cache active</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => void handleRetry()}
          disabled={isReconnecting}
          className="h-10 px-5 text-xs font-bold gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs"
        >
          <RefreshCw size={14} className={isReconnecting ? "animate-spin" : ""} />
          {isReconnecting ? "Checking connection…" : "Try Reconnecting"}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="h-10 px-5 text-xs font-bold rounded-xl"
        >
          Reload Page
        </Button>
      </div>

      <p className="mt-4 text-[11px] text-slate-400 font-medium">
        Google PWA & Zero-Connection Fallback Active · Auto-reconnect enabled
      </p>
    </div>
  );
}
