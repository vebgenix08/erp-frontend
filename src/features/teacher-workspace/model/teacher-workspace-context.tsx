import { createContext, useContext, type ReactNode } from "react";
import type {
  TeacherNavigationGroup,
  TeacherWorkspaceCapabilities,
  TeacherWorkspaceContext,
} from "./teacher-workspace.types";
import type { TeacherWorkloadWorkspace } from "../../teacher-workload/model/teacher-workload.types";

interface TeacherWorkspaceContextValue {
  activeNavigationGroup: TeacherNavigationGroup;
  visibleNavigation: TeacherNavigationGroup[];
  capabilities: TeacherWorkspaceCapabilities;
  accessLabel: string;
  operatingContext: TeacherWorkspaceContext;
  workspace: TeacherWorkloadWorkspace | null;
  workspaceLoading: boolean;
  workspaceError: string | null;
  retryWorkspace?: () => void;
}

const Context = createContext<TeacherWorkspaceContextValue | null>(null);

export function TeacherWorkspaceContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: TeacherWorkspaceContextValue;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// The hook shares this module with the provider so both use the same private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useTeacherWorkspace() {
  const context = useContext(Context);
  if (!context)
    throw new Error("useTeacherWorkspace must be used inside TeacherWorkspaceContextProvider");
  return context;
}
