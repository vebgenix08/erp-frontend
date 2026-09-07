import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "../../session/model/session-provider";
import { listCampuses } from "../api/settings.api";
import type { Campus } from "./settings.types";

interface SelectedCampusContextValue {
  campuses: Campus[];
  selectedCampus: Campus | null;
  loading: boolean;
  error: string | null;
  selectCampus: (campusId: string) => void;
  refreshCampuses: () => Promise<void>;
}

const SelectedCampusContext = createContext<SelectedCampusContextValue | null>(null);

export function SelectedCampusProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const tenantId = session?.selectedTenant?.tenantId ?? session?.tenant?.tenantId ?? "unknown";
  const storageKey = `erp:selected-campus:${tenantId}`;
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCampuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeCampuses = (await listCampuses()).filter((campus) => campus.status === "ACTIVE");
      const storedCampusId = window.localStorage.getItem(storageKey);
      const nextCampusId = activeCampuses.some((campus) => campus.id === storedCampusId)
        ? (storedCampusId ?? "")
        : (activeCampuses[0]?.id ?? "");
      setCampuses(activeCampuses);
      setSelectedCampusId((current) =>
        activeCampuses.some((campus) => campus.id === current) ? current : nextCampusId,
      );
      if (nextCampusId) window.localStorage.setItem(storageKey, nextCampusId);
      else window.localStorage.removeItem(storageKey);
    } catch (value) {
      setCampuses([]);
      setSelectedCampusId("");
      setError(value instanceof Error ? value.message : "Unable to load campuses");
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    void refreshCampuses();
  }, [refreshCampuses, tenantId]);

  const selectCampus = useCallback(
    (campusId: string) => {
      if (!campuses.some((campus) => campus.id === campusId)) return;
      setSelectedCampusId(campusId);
      window.localStorage.setItem(storageKey, campusId);
    },
    [campuses, storageKey],
  );

  const selectedCampus = campuses.find((campus) => campus.id === selectedCampusId) ?? null;
  const value = useMemo(
    () => ({ campuses, selectedCampus, loading, error, selectCampus, refreshCampuses }),
    [campuses, selectedCampus, loading, error, refreshCampuses, selectCampus],
  );

  return <SelectedCampusContext.Provider value={value}>{children}</SelectedCampusContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSelectedCampus() {
  const context = useContext(SelectedCampusContext);
  if (!context) throw new Error("useSelectedCampus must be used within SelectedCampusProvider");
  return context;
}
