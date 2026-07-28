import { ArrowLeft, Ban, Mail, RefreshCw, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  endEmployment,
  getEmployee,
  listEmployeeInviteAttempts,
  resendEmployeeInvite,
} from "../api/staff.api";
import type { Employee, EmployeeInviteAttempt } from "../model/staff.types";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Separator } from "../../../shared/ui/separator";

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function EmployeeProfile() {
  const { employeeId } = useParams();
  const { campuses } = useSelectedCampus();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attempts, setAttempts] = useState<EmployeeInviteAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [value, history] = await Promise.all([
        getEmployee(employeeId),
        listEmployeeInviteAttempts(employeeId),
      ]);
      setEmployee(value);
      setAttempts(history);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load employee");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (loading) return <LoadingState label="Loading employee profile" />;
  if (error && !employee) return <ErrorState message={error} retry={() => void load()} />;
  if (!employee) return null;

  const campus = (id: string) =>
    campuses.find((item) => item.id === id)?.name ?? "Unavailable campus";

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      setEmployee(await resendEmployeeInvite(employee.id));
      setAttempts(await listEmployeeInviteAttempts(employee.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to resend invite");
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    const reason = window.prompt("Reason for ending employment");
    if (!reason?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setEmployee(await endEmployment(employee.id, reason));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to end employment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6 max-w-6xl mx-auto">
      {/* Back link */}
      <Link to="/admin/staff" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={14} /> Back to Staff directory
      </Link>

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-600 shrink-0">
            <UserRound size={24} />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{employee.fullName}</h2>
              <Badge variant={employee.status === "ACTIVE" ? "success" : "secondary"}>
                {label(employee.status)}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Code: <span className="font-semibold text-slate-700">{employee.employeeCode}</span> · Category: <span className="font-semibold text-slate-700">{label(employee.staffType)}</span>
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: General Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-800">Employment details</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 pb-5">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-slate-400 font-medium">Primary campus</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{campus(employee.primaryCampusId)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Campus access</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{employee.campusIds.map(campus).join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Category</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{label(employee.staffCategory)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Employment type</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{label(employee.employmentType)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Designation</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{employee.designation || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Department</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{employee.department || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Joining date</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{new Date(employee.joiningDate).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Phone</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{employee.phone || "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-800">Login and invitation</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 pb-5">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-slate-400 font-medium">Email</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{employee.email || "Login not enabled"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Login status</dt>
                  <dd className="mt-1">
                    <Badge variant={employee.loginStatus === "ACTIVE" ? "success" : "secondary"}>
                      {label(employee.loginStatus)}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Invite attempts</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{employee.inviteAttempts}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Last attempt</dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {employee.lastInviteAttemptAt
                      ? new Date(employee.lastInviteAttemptAt).toLocaleString()
                      : "Not sent"}
                  </dd>
                </div>
                {employee.inviteError && (
                  <div className="sm:col-span-2">
                    <dt className="text-red-500 font-medium">Provisioning issue</dt>
                    <dd className="mt-1 text-sm text-red-750 font-semibold bg-red-50 border border-red-100 rounded-md p-3">
                      {employee.inviteError}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {attempts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-850">Invite delivery history</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-3 pb-3 divide-y divide-slate-100">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-start gap-3 py-3 text-sm">
                    <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                      <Mail size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">
                        Attempt {attempt.attemptNumber} ·{" "}
                        <span className={attempt.status === "SENT" ? "text-emerald-600" : "text-amber-600"}>
                          {label(attempt.status)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(attempt.createdAt).toLocaleString()}
                        {attempt.error ? ` · ${attempt.error}` : ""}
                      </p>
                    </div>
                    <code className="text-xs font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      {attempt.provider}
                    </code>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Actions Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-800">Actions</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 pb-5 space-y-3">
              {employee.email && ["INVITED", "FAILED"].includes(employee.loginStatus) && (
                <Button variant="outline" className="w-full justify-start text-left" disabled={busy} onClick={() => void resend()}>
                  <RefreshCw size={15} />
                  <div>
                    <span className="block font-semibold">Resend login invite</span>
                    <span className="block text-[11px] text-slate-400 font-normal leading-normal mt-0.5">
                      Request a fresh temporary password email.
                    </span>
                  </div>
                </Button>
              )}

              {employee.email && (
                <Button variant="outline" className="w-full justify-start text-left" asChild>
                  <a href={`mailto:${employee.email}`}>
                    <Mail size={15} />
                    <div>
                      <span className="block font-semibold">Email employee</span>
                      <span className="block text-[11px] text-slate-400 font-normal leading-normal mt-0.5">
                        Open your local email application.
                      </span>
                    </div>
                  </a>
                </Button>
              )}

              {employee.status !== "ENDED" && (
                <Button variant="destructive" className="w-full justify-start text-left" disabled={busy} onClick={() => void end()}>
                  <Ban size={15} />
                  <div>
                    <span className="block font-semibold">End employment</span>
                    <span className="block text-[11px] text-red-200 font-normal leading-normal mt-0.5">
                      Preserve history and disable access.
                    </span>
                  </div>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
