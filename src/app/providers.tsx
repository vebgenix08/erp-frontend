import type { ReactNode } from "react";
import { SessionProvider } from "../features/session/model/session-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
