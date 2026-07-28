import { Bell, Mail, MessageSquare, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { getNotificationPolicy, saveNotificationPolicy } from "../api/settings.api";
import type { NotificationPolicy } from "../model/settings.types";
import { StaffEmailInviteTemplate } from "./staff-email-invite-template";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Separator } from "../../../shared/ui/separator";
import { cn } from "../../../shared/ui/utils";

const audienceLabel: Record<string, string> = {
  TENANT_ADMINS: "Tenant administrators",
  APPLICANT: "Applicant / guardian",
  PARENT_STUDENT: "Parent or student",
  STAFF_MEMBER: "Staff member",
};

export function NotificationPolicyManagement() {
  const [policy, setPolicy] = useState<NotificationPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"POLICY" | "STAFF_INVITE">("POLICY");

  const load = () => {
    setError(null);
    getNotificationPolicy()
      .then(setPolicy)
      .catch((v) => setError(v instanceof Error ? v.message : "Unable to load notification policy"));
  };

  useEffect(load, []);

  async function save() {
    if (!policy) return;
    setSaving(true);
    setError(null);
    try {
      setPolicy(await saveNotificationPolicy(policy));
    } catch (v) {
      setError(v instanceof Error ? v.message : "Unable to save notification policy");
    } finally {
      setSaving(false);
    }
  }

  if (!policy) {
    return error ? (
      <ErrorState message={error} retry={load} />
    ) : (
      <LoadingState label="Loading notification policy" />
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notification Policy & Email Templates</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose which business events create email notifications and preview automated email templates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button disabled={saving} onClick={() => void save()} size="sm">
            <Save size={15} />
            {saving ? "Saving..." : "Save policy"}
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold text-slate-500">
        <button
          type="button"
          onClick={() => setActiveTab("POLICY")}
          className={cn(
            "pb-2.5 transition-all border-b-2 cursor-pointer",
            activeTab === "POLICY" ? "border-brand-600 text-brand-700 font-extrabold" : "border-transparent hover:text-slate-800",
          )}
        >
          Notification Delivery Policy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("STAFF_INVITE")}
          className={cn(
            "pb-2.5 transition-all border-b-2 cursor-pointer flex items-center gap-2",
            activeTab === "STAFF_INVITE" ? "border-brand-600 text-brand-700 font-extrabold" : "border-transparent hover:text-slate-800",
          )}
        >
          <Mail size={15} /> Staff Email Invitation Template
        </button>
      </div>

      {activeTab === "STAFF_INVITE" ? (
        <Card className="p-0 overflow-hidden border-slate-200">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Mail size={16} className="text-brand-600" /> Staff Email Invitation Template Live Preview
            </CardTitle>
            <Badge variant="brand" className="text-[10px] font-bold">
              Automated Staff Onboarding Email
            </Badge>
          </CardHeader>
          <CardContent className="p-0 bg-slate-100">
            <StaffEmailInviteTemplate />
          </CardContent>
        </Card>
      ) : (
        <>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Email Delivery Card */}
        <Card>
          <CardHeader className="flex-row items-start justify-between pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Mail size={17} />
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Email delivery</CardTitle>
                <p className="text-[10px] text-slate-400 mt-0.5">Amazon SES development channel</p>
              </div>
            </div>
            {/* Custom styled switch inline */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.emailEnabled}
                onChange={() => setPolicy({ ...policy, emailEnabled: !policy.emailEnabled })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-600"></div>
              <span className="ml-2 text-xs font-semibold text-slate-700 w-6">
                {policy.emailEnabled ? "On" : "Off"}
              </span>
            </label>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Admin notification email</Label>
              <Input
                id="admin-email"
                type="email"
                value={policy.adminEmail ?? ""}
                onChange={(e) => setPolicy({ ...policy, adminEmail: e.target.value })}
                placeholder="admin@institution.edu"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-to">Reply-to email</Label>
              <Input
                id="reply-to"
                type="email"
                value={policy.replyToEmail ?? ""}
                onChange={(e) => setPolicy({ ...policy, replyToEmail: e.target.value })}
                placeholder="office@institution.edu"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={policy.timezone}
                onChange={(e) => setPolicy({ ...policy, timezone: e.target.value })}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              >
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* SMS Delivery Card */}
        <Card className="opacity-75 bg-slate-50/50">
          <CardHeader className="flex-row items-start justify-between pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <MessageSquare size={17} />
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-slate-500">SMS delivery</CardTitle>
                <p className="text-[10px] text-slate-400 mt-0.5">Provider not configured</p>
              </div>
            </div>
            <Badge variant="secondary">UNAVAILABLE</Badge>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              SMS can be enabled after a provider, sender identity, delivery webhook and secret are configured in the communication service settings.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Events List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Bell size={16} />
            </span>
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">Business events</CardTitle>
              <p className="text-[10px] text-slate-405 mt-0.5">
                Email and SMS are evaluated independently for each event
              </p>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {policy.events.map((event) => (
              <div key={event.event} className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm text-slate-800 font-semibold">{event.label}</strong>
                  <span className="block text-xs text-slate-400 mt-0.5">{audienceLabel[event.audience]}</span>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!policy.emailEnabled}
                      checked={event.email}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          events: policy.events.map((item) =>
                            item.event === event.event ? { ...item, email: e.target.checked } : item,
                          ),
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-accent-650 focus:ring-accent-600 disabled:opacity-50"
                    />
                    <span className="text-xs text-slate-650 font-medium">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-not-allowed opacity-50" title="SMS provider is not configured">
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                      className="h-4 w-4 rounded border-slate-300 text-slate-400"
                    />
                    <span className="text-xs text-slate-400 font-medium">SMS</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </section>
  );
}
