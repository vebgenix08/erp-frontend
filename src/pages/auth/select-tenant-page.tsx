import { Building2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionDashboardPath } from "../../features/session/api/session.api";
import { useSession } from "../../features/session/model/session-provider";
import { TenantSelector } from "../../features/session/ui/tenant-selector";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";

export function SelectTenantPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session?.tenant) navigate(getSessionDashboardPath(session), { replace: true });
  }, [navigate, session]);
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Building2 size={18} />
        </span>
        <CardTitle>Select institution</CardTitle>
        <p className="text-sm text-slate-500">
          Continue in the institution assigned to your account.
        </p>
      </CardHeader>
      <CardContent>
        <TenantSelector />
      </CardContent>
    </Card>
  );
}
