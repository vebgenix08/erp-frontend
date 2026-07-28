import { Building2, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { TenantRecord } from "../model/tenant.types";
import { EmptyState } from "../../../shared/ui/page-state";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";

const tenantStatusVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case "ACTIVE": return "success";
    case "SUSPENDED": return "destructive";
    case "ONBOARDING": return "warning";
    case "PENDING_DELETION": return "destructive";
    default: return "secondary";
  }
};

export function TenantList({ tenants }: { tenants: TenantRecord[] }) {
  if (!tenants.length)
    return (
      <EmptyState
        title="No tenants found"
        description="Create an institution or adjust your search criteria."
        action={
          <Button size="sm" asChild>
            <Link to="/platform/tenants/new">
              <Plus size={15} /> Create tenant
            </Link>
          </Button>
        }
      />
    );

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Institution</TableHead>
            <TableHead>Workspace</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
                    <Building2 size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{tenant.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {tenant.contactEmail || "No contact email"}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                  {tenant.slug}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant={tenantStatusVariant(tenant.status)}>
                  {tenant.status.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-500">
                {new Date(tenant.updatedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Link
                  title={`Open ${tenant.name}`}
                  aria-label={`Open ${tenant.name}`}
                  to={`/platform/tenants/${tenant.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <ChevronRight size={16} />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
