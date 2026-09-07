import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Printer,
  UserCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  approveApplication,
  confirmApplication,
  getApplication,
  rejectApplication,
} from "../api/applications.api";
import type { AdmissionApplication, ApplicationStatus } from "../model/application.types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";

const displayDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "Not recorded";

const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ApplicationDetail() {
  const { applicationId = "" } = useParams();
  const [record, setRecord] = useState<AdmissionApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setError(null);
    try {
      const data = await getApplication(applicationId);
      setRecord(data);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load application details");
    }
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async () => {
    if (!record) return;
    setBusy(true);
    try {
      await approveApplication(record.id, "Approved by administrator");
      await load();
    } catch (val) {
      setError(val instanceof Error ? val.message : "Failed to approve application");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!record) return;
    setBusy(true);
    try {
      await confirmApplication(record.id, true);
      await load();
    } catch (val) {
      setError(val instanceof Error ? val.message : "Failed to confirm admission");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!record) return;
    setBusy(true);
    try {
      await rejectApplication(record.id, "Application rejected");
      await load();
    } catch (val) {
      setError(val instanceof Error ? val.message : "Failed to reject application");
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} retry={load} />;
  if (!record) return <LoadingState label="Loading admission application details..." />;

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "SUBMITTED":
        return (
          <Badge variant="default" className="bg-blue-600">
            Submitted
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="brand" className="bg-purple-600">
            Approved
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="success" className="bg-emerald-600">
            Admission Confirmed
          </Badge>
        );
      case "REJECTED":
      case "CANCELLED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <section className="space-y-6 pb-12 font-sans text-slate-900 leading-normal">
      {/* Top Header & Actions */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold">
            <Link to="/admin/admissions/applications">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Applications
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 truncate">
                {record.studentName}
              </h1>
              {getStatusBadge(record.status)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 font-mono">
              Application No: {record.applicationNumber ?? "Draft"} • ID: {record.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="h-8 text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Form PDF
          </Button>

          {record.status === "SUBMITTED" && (
            <Button
              size="sm"
              disabled={busy}
              onClick={handleApprove}
              className="h-8 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Approve Application
            </Button>
          )}

          {(record.status === "APPROVED" || record.status === "SUBMITTED") && (
            <Button
              size="sm"
              disabled={busy}
              onClick={handleConfirm}
              className="h-8 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm Admission
            </Button>
          )}

          {record.status !== "REJECTED" && record.status !== "CONFIRMED" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={handleReject}
              className="h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
            </Button>
          )}
        </div>
      </header>

      {/* Main Official Form Preview Document Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 8 Cols: Form Preview Content */}
        <div className="space-y-6 lg:col-span-8">
          {/* Section 1: Applicant Information Form Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Section 1: Applicant & Enrolment Information
            </h2>

            <dl className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Student Full Name
                </dt>
                <dd className="mt-1 font-extrabold text-slate-900 text-sm">{record.studentName}</dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Academic Class
                </dt>
                <dd className="mt-1 font-extrabold text-blue-700 text-sm">
                  {record.academicTargetId ? label(record.academicTargetId) : "Class 10"}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Allocated Section
                </dt>
                <dd className="mt-1 font-bold text-slate-800">
                  {record.sectionId ? label(record.sectionId) : "Section A (Default)"}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Gender
                </dt>
                <dd className="mt-1 font-bold text-slate-800">{record.gender ?? "MALE"}</dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Date of Birth
                </dt>
                <dd className="mt-1 font-bold text-slate-800">
                  {record.dateOfBirth
                    ? new Date(record.dateOfBirth).toLocaleDateString("en-IN")
                    : "Not recorded"}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Application Date
                </dt>
                <dd className="mt-1 font-bold text-slate-800">{displayDate(record.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Section 2: Parent & Guardian Details Form Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-emerald-600" />
              Section 2: Parent & Guardian Details
            </h2>

            <dl className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Parent / Guardian Name
                </dt>
                <dd className="mt-1 font-extrabold text-slate-900">{record.parentName}</dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Primary Contact Phone
                </dt>
                <dd className="mt-1 font-extrabold text-emerald-700">{record.phone}</dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Email Address
                </dt>
                <dd className="mt-1 font-bold text-slate-800">{record.email || "Not provided"}</dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Parent Relationship
                </dt>
                <dd className="mt-1 font-bold text-slate-800">
                  {record.parentRelation || "Father"}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 sm:col-span-2">
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Residential Address
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {record.address || "Main City Address"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Section 3: Custom Form Fields & Template Responses */}
          {record.customFields && Object.keys(record.customFields).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Section 3: Custom Template Form Fields
              </h2>

              <dl className="grid gap-4 sm:grid-cols-2 text-xs">
                {Object.entries(record.customFields).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                    <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {label(key)}
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "—")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Attached Documents + Workflow History Timeline */}
        <div className="space-y-6 lg:col-span-4">
          {/* Documents Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Attached Documents</span>
              <Badge variant="secondary" className="text-[10px]">
                {record.documents.length}
              </Badge>
            </h3>

            {record.documents.length ? (
              <div className="space-y-2">
                {record.documents.map((doc) => (
                  <div
                    key={doc.fileId}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{doc.fileName}</p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {label(doc.documentType)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] font-semibold text-blue-600 border-blue-200"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                No documents uploaded with application.
              </p>
            )}
          </div>

          {/* Workflow History Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" /> Workflow Stage History
            </h3>

            <ol className="space-y-3">
              {record.stageHistory.map((entry, index) => (
                <li
                  key={`${entry.status}-${entry.at}-${index}`}
                  className="border-l-2 border-blue-200 pl-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">
                      {label(entry.status)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {displayDate(entry.at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    {entry.remarks ?? "Workflow transition logged"}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
