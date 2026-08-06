import {
  ArrowLeft,
  Ban,
  BookOpen,
  Building2,
  CalendarDays,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Mail,
  RefreshCw,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  endEmployment,
  deactivateEmployee,
  getEmployee,
  listEmployeeInviteAttempts,
  listEmployeeInviteDeliveryEvents,
  resendEmployeeInvite,
  reactivateEmployee,
} from "../api/staff.api";
import type { Employee, EmployeeInviteAttempt, EmployeeInviteDeliveryEvent } from "../model/staff.types";
import { Button } from "../../../shared/ui/button";
import { Badge } from "../../../shared/ui/badge";
import { Separator } from "../../../shared/ui/separator";
import { listClasses, listPrograms, listSections } from "../../academic-structure/api/academic-structure.api";
import {
  listAcademicResponsibilities,
  listCurriculumSubjects,
  listOfferingAssignments,
  listSubjectCatalogue,
  listSubjectOfferings,
} from "../../academic-planning/api/academic-planning.api";
import { listTenantTemplates } from "../../tenant-settings/api/settings.api";
import { getFileDownloadUrl } from "../../storage/api/files.api";
import { cn } from "../../../shared/ui/utils";
import { EditEmployeeDialog } from "./edit-employee-dialog";

type ProfileTab =
  | "SUMMARY"
  | "ACADEMICS"
  | "MENTORING"
  | "DOCUMENTS"
  | "ACCESS"
  | "TIMELINE";

const tabConfig: Array<{ key: ProfileTab; label: string; icon: LucideIcon }> = [
  { key: "SUMMARY", label: "Summary", icon: UserRound },
  { key: "ACADEMICS", label: "Academic Details", icon: GraduationCap },
  { key: "MENTORING", label: "Mentoring & Incharge", icon: Users },
  { key: "DOCUMENTS", label: "Documents", icon: FileText },
  { key: "ACCESS", label: "Access & Security", icon: Mail },
  { key: "TIMELINE", label: "Timeline", icon: Clock },
];

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { campuses } = useSelectedCampus();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attempts, setAttempts] = useState<EmployeeInviteAttempt[]>([]);
  const [deliveryEvents,setDeliveryEvents]=useState<EmployeeInviteDeliveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>("SUMMARY");
  const [assignments, setAssignments] = useState<
    Array<{ id: string; title: string; detail: string; campusId: string; status: string; role: string }>
  >([]);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [profilePhotoKey, setProfilePhotoKey] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const load = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [value, history, providerEvents] = await Promise.all([
        getEmployee(employeeId),
        listEmployeeInviteAttempts(employeeId),
        listEmployeeInviteDeliveryEvents(employeeId),
      ]);
      setEmployee(value);
      setAttempts(history);
      setDeliveryEvents(providerEvents);
      if (value.templateId) {
        const templates = await listTenantTemplates();
        const template = templates.find((item) => item.id === value.templateId);
        setFieldLabels(
          Object.fromEntries((template?.fields ?? []).map((field) => [field.key, field.label]))
        );
        const photoField = template?.fields.find((field) => field.label.trim().toLowerCase() === "profile photo");
        const storedPhoto = photoField ? value.customFields?.[photoField.key] : undefined;
        const legacyPhotoFileId = storedPhoto && typeof storedPhoto === "object" && "fileId" in storedPhoto && typeof storedPhoto.fileId === "string"
          ? storedPhoto.fileId
          : undefined;
        setProfilePhotoKey(photoField?.key ?? null);
        const photoFileId = value.profilePhotoFileId ?? legacyPhotoFileId;
        setProfilePhotoUrl(photoFileId ? await getFileDownloadUrl(photoFileId).catch(() => null) : null);
      } else {
        setFieldLabels({});
        setProfilePhotoKey(null);
        setProfilePhotoUrl(null);
      }
      const [assignmentRows, responsibilities, curricula, catalogue] = await Promise.all([
        listOfferingAssignments({ employeeId: value.id }),
        listAcademicResponsibilities({ employeeId: value.id }),
        listCurriculumSubjects(),
        listSubjectCatalogue(),
      ]);
      const campusResults = await Promise.all(
        value.campusIds.map(async (campusId) => {
          const [programs, classes, sections, offerings] = await Promise.all([
            listPrograms(campusId),
            listClasses(campusId),
            listSections(campusId),
            listSubjectOfferings({ campusId }),
          ]);
          return { campusId, offerings, records: [...programs, ...classes, ...sections] };
        })
      );
      const offeringMap = new Map(
        campusResults.flatMap((result) =>
          result.offerings.map((offering) => [offering.id, { ...offering, campusId: result.campusId }])
        )
      );
      const curriculumMap = new Map(curricula.map((item) => [item.id, item]));
      const subjectMap = new Map(catalogue.map((item) => [item.id, item.name]));
      const recordLabels = Object.fromEntries(
        campusResults.flatMap((result) => result.records.map((record) => [record.id, record.name]))
      );
      setAssignments([
        ...assignmentRows.map((assignment) => {
          const offering = offeringMap.get(assignment.subjectOfferingId);
          const curriculum = curriculumMap.get(offering?.curriculumSubjectId ?? "");
          return {
            id: assignment.id,
            title: subjectMap.get(curriculum?.subjectCatalogueId ?? "") ?? "Subject teacher",
            detail: `${assignment.assignmentRole.replaceAll("_", " ")} · ${
              offering?.requiredPeriodsPerWeek ?? 0
            } periods/week`,
            campusId: offering?.campusId ?? value.campusIds[0] ?? "",
            status: assignment.status,
            role: assignment.assignmentRole,
          };
        }),
        ...responsibilities.map((item) => ({
          id: item.id,
          title: item.responsibilityType.replaceAll("_", " "),
          detail:
            [recordLabels[item.academicLevelId ?? ""], recordLabels[item.sectionId ?? ""]]
              .filter(Boolean)
              .join(" · ") || "Academic responsibility",
          campusId: item.campusId,
          status: item.status,
          role: item.responsibilityType,
        })),
      ]);
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

  const campus = (id: string) => campuses.find((item) => item.id === id)?.name ?? "Unavailable campus";

  const customFields = Object.entries(employee.customFields ?? {});
  const documents = customFields.filter(([key, value]) => key !== profilePhotoKey && value && typeof value === "object" && "fileId" in value);
  const profileFields = customFields.filter(
    ([, value]) => !(value && typeof value === "object" && "fileId" in value)
  );
  const fieldLabel = (key: string) => fieldLabels[key] ?? label(key.split(".").at(-1) ?? key);

  const downloadDocument = async (fileId: string) => {
    try {
      window.open(await getFileDownloadUrl(fileId), "_blank", "noopener,noreferrer");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to download employee document");
    }
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      setEmployee(await resendEmployeeInvite(employee.id));
      const [history,providerEvents]=await Promise.all([listEmployeeInviteAttempts(employee.id),listEmployeeInviteDeliveryEvents(employee.id)]);
      setAttempts(history);
      setDeliveryEvents(providerEvents);
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

  const changeActiveState = async () => {
    const reactivating = employee.status === "INACTIVE";
    if (!window.confirm(reactivating ? "Reactivate this employee and login access?" : "Deactivate this employee and disable login access?")) return;
    setBusy(true);
    setError(null);
    try {
      setEmployee(reactivating ? await reactivateEmployee(employee.id) : await deactivateEmployee(employee.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to change employee status");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6 pb-12 font-sans text-slate-900">
      {/* Top Breadcrumb Link */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/admin/staff" className="hover:text-blue-600 transition-colors">
          Staff Directory
        </Link>
        <span>/</span>
        <span className="text-slate-900">{employee.fullName}</span>
      </div>

      {/* 360° Staff Profile Header Banner Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-md">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={`${employee.fullName} profile`} className="h-full w-full object-cover" />
              ) : employee.fullName.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">{employee.fullName}</h1>
                <Badge variant={employee.status === "ACTIVE" ? "success" : "secondary"}>
                  {label(employee.status)}
                </Badge>
                <Badge variant={employee.loginStatus === "ACTIVE" ? "success" : "secondary"}>
                  Login: {label(employee.loginStatus)}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                <span>
                  Code: <strong className="text-slate-800 font-bold font-mono">{employee.employeeCode}</strong>
                </span>
                <span>•</span>
                <span>
                  Category: <strong className="text-slate-800 font-bold">{label(employee.staffCategory)}</strong>
                </span>
                <span>•</span>
                <span>
                  Designation: <strong className="text-slate-800 font-bold">{employee.designation || "—"}</strong>
                </span>
                <span>•</span>
                <span>
                  Department: <strong className="text-slate-800 font-bold">{employee.department || "—"}</strong>
                </span>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Primary Campus: <strong className="text-slate-800 font-bold">{campus(employee.primaryCampusId)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EditEmployeeDialog employee={employee} campuses={campuses} disabled={busy} onUpdated={(updated) => { setEmployee(updated); void load(); }} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/staff")}
              className="h-9 px-3 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            {employee.staffCategory === "TEACHING" && (
              <Button size="sm" variant="outline" asChild className="h-9 px-3 text-xs font-semibold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100">
                <Link to={`/admin/teachers/${employee.id}/workload`}>
                  <CalendarDays className="h-3.5 w-3.5 mr-1" /> Workload & Timetable
                </Link>
              </Button>
            )}
            {employee.email && ["INVITED", "FAILED"].includes(employee.loginStatus) && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void resend()}
                className="h-9 px-3 text-xs font-semibold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Resend Invite
              </Button>
            )}
            {employee.status !== "ENDED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void changeActiveState()}
                className="h-9 px-3 text-xs font-semibold"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" /> {employee.status === "INACTIVE" ? "Reactivate" : "Deactivate"}
              </Button>
            )}
            {employee.status !== "ENDED" && (
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void end()}
                className="h-9 px-3 text-xs font-semibold"
              >
                <Ban className="h-3.5 w-3.5 mr-1" /> End Employment
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs">
          {error}
        </div>
      )}

      {/* Modern Horizontal Sub-Tabs Bar (Matching Student Profile) */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
        {tabConfig.map((t) => {
          const isActive = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold shrink-0 transition-all",
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Grid Content Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Main Detail Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* SUMMARY TAB */}
          {tab === "SUMMARY" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Employment & Campus Details
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-xs">
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Primary Campus</dt>
                    <dd className="mt-1 font-bold text-slate-900">{campus(employee.primaryCampusId)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Campus Access</dt>
                    <dd className="mt-1 font-bold text-slate-900">{employee.campusIds.map(campus).join(", ")}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Category</dt>
                    <dd className="mt-1 font-bold text-slate-900">{label(employee.staffCategory)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Employment Type</dt>
                    <dd className="mt-1 font-bold text-slate-900">{label(employee.employmentType)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Designation</dt>
                    <dd className="mt-1 font-bold text-slate-900">{employee.designation || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Department</dt>
                    <dd className="mt-1 font-bold text-slate-900">{employee.department || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Joining Date</dt>
                    <dd className="mt-1 font-bold text-slate-900">{new Date(employee.joiningDate).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Phone Contact</dt>
                    <dd className="mt-1 font-bold text-slate-900">{employee.phone || "—"}</dd>
                  </div>
                </dl>
              </div>

              {profileFields.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                    Additional Profile Fields
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    {profileFields.map(([key, value]) => (
                      <div key={key}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{fieldLabel(key)}</p>
                        <p className="mt-1 font-bold text-slate-900">
                          {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "—")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACADEMICS TAB */}
          {tab === "ACADEMICS" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" /> Academic & Teaching Assignments
              </h3>
              {assignments.length ? (
                <div className="divide-y divide-slate-100">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{label(assignment.title)}</p>
                        <p className="text-slate-500 mt-0.5">{assignment.detail}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-700">{campus(assignment.campusId)}</p>
                        <Badge variant={assignment.status === "ACTIVE" ? "success" : "secondary"}>
                          {label(assignment.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No teaching or subject assignment has been recorded.
                </p>
              )}
            </div>
          )}

          {/* MENTORING TAB */}
          {tab === "MENTORING" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" /> Mentor & Class Teacher Responsibilities
              </h3>
              {assignments.filter((item) => ["SECTION_INCHARGE", "CLASS_TEACHER", "MENTOR"].includes(item.role)).length ? (
                <div className="space-y-3">
                  {assignments
                    .filter((item) => ["SECTION_INCHARGE", "CLASS_TEACHER", "MENTOR"].includes(item.role))
                    .map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
                        <p className="font-bold text-slate-900">{label(item.title)}</p>
                        <p className="text-slate-500 mt-0.5">{item.detail} • {campus(item.campusId)}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No class teacher or mentoring responsibility assigned.
                </p>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {tab === "DOCUMENTS" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" /> Employee Stored Documents
              </h3>
              {documents.length ? (
                <div className="space-y-3">
                  {documents.map(([key, value]) => {
                    const file = value as { fileId: string; fileName?: string; contentType?: string };
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{fieldLabel(key)}</p>
                          <p className="text-slate-400 mt-0.5 font-mono text-[11px]">
                            {file.fileName ?? "Stored document"} {file.contentType ? `• ${file.contentType}` : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void downloadDocument(file.fileId)}
                          className="h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> Download
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No employee documents are stored.
                </p>
              )}
            </div>
          )}

          {/* ACCESS TAB */}
          {tab === "ACCESS" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Login & Provisioning Status
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-xs">
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Email Address</dt>
                    <dd className="mt-1 font-bold text-slate-900">{employee.email || "Login not enabled"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Login Status</dt>
                    <dd className="mt-1">
                      <Badge variant={employee.loginStatus === "ACTIVE" ? "success" : "secondary"}>
                        {label(employee.loginStatus)}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Invite Attempts</dt>
                    <dd className="mt-1 font-bold text-slate-900">{employee.inviteAttempts}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Last Attempt At</dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {employee.lastInviteAttemptAt
                        ? new Date(employee.lastInviteAttemptAt).toLocaleString()
                        : "Not sent"}
                    </dd>
                  </div>
                </dl>
              </div>

              {attempts.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                    Invite Delivery Log
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {attempts.map((attempt) => (
                      <div key={attempt.id} className="flex items-start gap-3 py-3 text-xs">
                        <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900">
                            Attempt #{attempt.attemptNumber} •{" "}
                            <span className={attempt.status === "SENT" ? "text-emerald-600" : "text-amber-600"}>
                              {label(attempt.status)}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(attempt.createdAt).toLocaleString()} {attempt.error ? `• ${attempt.error}` : ""}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {attempt.provider}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {deliveryEvents.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">SES delivery history</h3>
                  <div className="divide-y divide-slate-100">
                    {deliveryEvents.map(event=><div key={event.id} className="flex items-center justify-between gap-3 py-3 text-xs"><div><p className="font-bold text-slate-900">{label(event.eventType)}</p><p className="mt-0.5 text-[11px] text-slate-400">Amazon SES provider event</p></div><time className="shrink-0 text-[11px] text-slate-500">{new Date(event.occurredAt).toLocaleString()}</time></div>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TIMELINE TAB */}
          {tab === "TIMELINE" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Employment Activity Timeline
              </h3>
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Employee record created</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(employee.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Joined the institution</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(employee.joiningDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {employee.invitedAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Login invitation sent</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{new Date(employee.invitedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Quick Info Card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Employee Quick Overview
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Category</span>
                <span className="font-bold text-slate-900">{label(employee.staffCategory)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Staff Type</span>
                <span className="font-bold text-slate-900">{label(employee.staffType)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Employment</span>
                <span className="font-bold text-slate-900">{label(employee.employmentType)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Assignments</span>
                <span className="font-bold text-blue-600">{assignments.length} assigned</span>
              </div>
            </div>

            <Separator />

            {employee.email && (
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-semibold h-9"
                asChild
              >
                <a href={`mailto:${employee.email}`}>
                  <Mail className="h-4 w-4 mr-2 text-blue-600" /> Send Direct Email
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
