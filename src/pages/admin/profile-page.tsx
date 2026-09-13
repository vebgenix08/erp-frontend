import { Building2, KeyRound, ShieldCheck, UserCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../../features/session/model/session-provider";
import { useMemberProfilePhoto } from "../../features/session/model/use-member-profile-photo";
import { InstitutionProfileSettings } from "../../features/tenant-settings/ui/institution-profile";
import { Badge } from "../../shared/ui/badge";
import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Input } from "../../shared/ui/input";
import { Label } from "../../shared/ui/label";
import { cn } from "../../shared/ui/utils";

type ProfileTab = "institution" | "account";

export function AdminProfilePage() {
  const { session } = useSession();
  const memberPhoto = useMemberProfilePhoto(session?.user.profilePhotoFileId);
  const [activeTab, setActiveTab] = useState<ProfileTab>("institution");

  // User Profile details from session
  const email = session?.user.email ?? "Email unavailable";
  const assignedRole =
    session?.user.role ?? session?.user.roles[0]?.name ?? session?.user.roles[0]?.code;
  const role = assignedRole?.replaceAll("_", " ") ?? "No role assigned";
  const userInitials = email.split("@")[0]?.slice(0, 2).toUpperCase() || "AD";

  return (
    <section className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Single Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Profile & Institution Settings
            </h1>
            <Badge
              variant="secondary"
              className="text-[10px] font-bold text-brand-700 bg-brand-50 border-brand-200"
            >
              Enterprise Hub
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage your personal administrator credentials, security, and global school branding.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("institution")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
              activeTab === "institution"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Building2
              size={14}
              className={activeTab === "institution" ? "text-brand-600" : "text-slate-400"}
            />
            Institution Identity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
              activeTab === "account"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <UserRound
              size={14}
              className={activeTab === "account" ? "text-brand-600" : "text-slate-400"}
            />
            My Admin Account
          </button>
        </div>
      </header>

      {/* TAB 1: INSTITUTION PROFILE */}
      {activeTab === "institution" && (
        <div className="animate-in fade-in duration-200">
          <InstitutionProfileSettings />
        </div>
      )}

      {/* TAB 2: MY ADMIN ACCOUNT & SECURITY */}
      {activeTab === "account" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* User Identity Snapshot Card */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-md">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-600 text-white font-extrabold text-2xl shadow-md border-2 border-slate-700">
                {memberPhoto ? (
                  <img
                    src={memberPhoto}
                    alt={`${email} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </span>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg font-extrabold text-white truncate">{email}</h2>
                  <Badge variant="brand" className="text-[10px] uppercase font-bold tracking-wider">
                    {role}
                  </Badge>
                  <span className="rounded-md bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Active Session
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300 font-medium">
                  Primary administrator account with full tenant governance privileges.
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" /> Multi-Factor Auth
                    (Cognito)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UserCheck size={14} className="text-brand-400" /> Full Access Scope
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Account Details (6 Cols) */}
            <Card className="lg:col-span-6 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900">
                  Administrator Details
                </CardTitle>
                <p className="text-[11px] text-slate-500 font-medium">
                  Identity claims and tenant access configuration
                </p>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Authenticated Email</Label>
                  <Input
                    value={email}
                    disabled
                    className="h-10 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Assigned Privilege Tier
                  </Label>
                  <Input
                    value={role}
                    disabled
                    className="h-10 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Tenant Operating Scope</Label>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
                    <p className="font-bold text-slate-800">All Campuses & Academic Years</p>
                    <p className="text-[10px] text-slate-500">
                      You have full institutional authorization across admissions, fee ledgers,
                      staff assignments, and academic settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Change Password & Security (6 Cols) */}
            <Card className="lg:col-span-6 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900">
                  Security & Password
                </CardTitle>
                <p className="text-[11px] text-slate-500 font-medium">
                  Update your authentication credentials
                </p>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-xs leading-5 text-slate-600">
                  Password changes are completed through Cognito verification. A verification code
                  is sent to the authenticated email address before the new password is accepted.
                </p>
                <Button asChild className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl">
                  <Link
                    to={`/forgot-password?username=${encodeURIComponent(session?.user.email ?? "")}`}
                  >
                    <KeyRound size={14} /> Reset password securely
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
