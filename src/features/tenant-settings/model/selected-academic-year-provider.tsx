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
import { listAcademicYears } from "../api/settings.api";
import type { AcademicYear } from "./settings.types";

interface Value {
  academicYears: AcademicYear[];
  selectedAcademicYear: AcademicYear | null;
  loading: boolean;
  error: string | null;
  selectAcademicYear: (id: string) => void;
  refreshAcademicYears: () => Promise<void>;
}
const Context = createContext<Value | null>(null);
export function SelectedAcademicYearProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const tenantId = session?.selectedTenant?.tenantId ?? session?.tenant?.tenantId ?? "unknown";
  const storageKey = `erp:selected-academic-year:${tenantId}`;
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshAcademicYears = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const years = await listAcademicYears();
      const stored = window.localStorage.getItem(storageKey);
      const next =
        years.find((year) => year.id === stored) ??
        years.find((year) => year.status === "ACTIVE") ??
        years[0] ??
        null;
      setAcademicYears(years);
      setSelectedId((current) =>
        years.find((year) => year.id === current) ? current : (next?.id ?? ""),
      );
      if (next) window.localStorage.setItem(storageKey, next.id);
      else window.localStorage.removeItem(storageKey);
    } catch (value) {
      setAcademicYears([]);
      setSelectedId("");
      setError(value instanceof Error ? value.message : "Unable to load academic years");
    } finally {
      setLoading(false);
    }
  }, [storageKey]);
  useEffect(() => {
    void refreshAcademicYears();
  }, [refreshAcademicYears, tenantId]);
  const selectAcademicYear = useCallback(
    (id: string) => {
      if (!academicYears.some((year) => year.id === id)) return;
      setSelectedId(id);
      window.localStorage.setItem(storageKey, id);
    },
    [academicYears, storageKey],
  );
  const selectedAcademicYear = academicYears.find((year) => year.id === selectedId) ?? null;
  const value = useMemo(
    () => ({
      academicYears,
      selectedAcademicYear,
      loading,
      error,
      selectAcademicYear,
      refreshAcademicYears,
    }),
    [academicYears, selectedAcademicYear, loading, error, selectAcademicYear, refreshAcademicYears],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useSelectedAcademicYear() {
  const context = useContext(Context);
  if (!context)
    throw new Error("useSelectedAcademicYear must be used within SelectedAcademicYearProvider");
  return context;
}
