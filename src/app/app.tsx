import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { AppErrorBoundary } from "../shared/ui/app-error-boundary";

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppErrorBoundary>
          <AppRoutes />
        </AppErrorBoundary>
      </BrowserRouter>
    </AppProviders>
  );
}
