import { useEffect, useState, type FormEvent } from "react";
import type { TenantRecord } from "../model/tenant.types";
import {
  createFirstAdminBootstrap,
  getFirstAdminBootstrap,
  listInviteDeliveryEvents,
  resendFirstAdminBootstrapInvite,
  type FirstAdminBootstrap,
  type InviteDeliveryEvent,
} from "../api/bootstrap.api";
import { CheckCircle2, Clock3, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Card, CardContent } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Separator } from "../../../shared/ui/separator";
import { Spinner } from "../../../shared/ui/spinner";

interface TenantOnboardingProps {
  tenant: TenantRecord | null;
}

export function TenantOnboarding({ tenant }: TenantOnboardingProps) {
  const [bootstrap, setBootstrap] = useState<FirstAdminBootstrap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryEvents, setDeliveryEvents] = useState<InviteDeliveryEvent[]>([]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  useEffect(() => {
    if (!tenant) return;
    setLoading(true);
    void getFirstAdminBootstrap(tenant.id)
      .then(async (value) => {
        setBootstrap(value);
        setDeliveryEvents(value ? await listInviteDeliveryEvents(value.adminEmail) : []);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Unable to load onboarding"),
      )
      .finally(() => setLoading(false));
  }, [tenant]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!tenant) return;
    setLoading(true);
    setError(null);
    try {
      setBootstrap(
        await createFirstAdminBootstrap({
          tenantId: tenant.id,
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          ...(adminPhone.trim() ? { adminPhone: adminPhone.trim() } : {}),
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to invite administrator");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!tenant) return;
    setLoading(true);
    setError(null);
    try {
      setBootstrap(await resendFirstAdminBootstrapInvite(tenant.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to resend administrator invite");
    } finally {
      setLoading(false);
    }
  }

  if (!tenant) {
    return <p className="text-sm text-slate-500">Select a tenant to continue onboarding.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{tenant.name} onboarding</h2>
          <p className="mt-1 text-sm text-slate-500">
            {tenant.slug ? `${tenant.slug} · ` : ""}
            {tenant.status.replaceAll("_", " ")}
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !bootstrap ? (
        <div className="flex justify-center py-6">
          <Spinner className="h-6 w-6" />
        </div>
      ) : bootstrap ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Status info */}
          <Card className="md:col-span-2">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-800">First administrator state</h3>
                <Badge variant={bootstrap.status === "COMPLETED" ? "success" : "secondary"}>
                  {bootstrap.status}
                </Badge>
              </div>
              <div className="text-sm space-y-1.5 text-slate-650">
                <p>
                  <strong className="text-slate-800">Name:</strong> {bootstrap.adminName}
                </p>
                <p>
                  <strong className="text-slate-800">Email:</strong> {bootstrap.adminEmail}
                </p>
                <p>
                  <strong className="text-slate-800">Invite attempts:</strong> {bootstrap.inviteAttempts} of 5
                </p>
                {bootstrap.invitedAt && (
                  <p>
                    <strong className="text-slate-800">Last invitation:</strong>{" "}
                    {new Date(bootstrap.invitedAt).toLocaleString()}
                  </p>
                )}
                {bootstrap.inviteError && (
                  <p className="text-red-600">
                    <strong className="text-slate-800">Error:</strong> {bootstrap.inviteError}
                  </p>
                )}
              </div>
              {bootstrap.status !== "COMPLETED" && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={bootstrap.inviteAttempts >= 5 || loading}
                    onClick={() => void resend()}
                  >
                    {loading ? (
                      <><Spinner className="h-3.5 w-3.5" /> Sending…</>
                    ) : (
                      <><RefreshCw size={14} /> Resend invite</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery history */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-805">Delivery history</h3>
              {deliveryEvents.length > 0 ? (
                <div className="space-y-3">
                  {deliveryEvents.map((event) => {
                    const isDelivered = event.eventType === "DELIVERY";
                    const isIssue = ["BOUNCE", "COMPLAINT", "REJECT"].includes(event.eventType);
                    return (
                      <div key={event.id} className="flex gap-2.5 items-start text-xs border-b border-slate-100 pb-2">
                        {isDelivered ? (
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        ) : isIssue ? (
                          <TriangleAlert size={15} className="text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <Clock3 size={15} className="text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <strong className="block text-slate-800 font-semibold">
                            {event.eventType.replaceAll("_", " ")}
                          </strong>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {new Date(event.occurredAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-normal">
                  No SES delivery events have been recorded for this address.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <form className="space-y-4 max-w-lg" onSubmit={(event) => void submit(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="boot-name">Administrator name</Label>
                <Input
                  id="boot-name"
                  required
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  placeholder="Administrator name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="boot-email">Administrator email</Label>
                <Input
                  id="boot-email"
                  required
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="admin@institution.edu"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="boot-phone">Phone</Label>
                <Input
                  id="boot-phone"
                  value={adminPhone}
                  onChange={(event) => setAdminPhone(event.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? <Spinner className="h-3.5 w-3.5" /> : "Send Cognito invite"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
