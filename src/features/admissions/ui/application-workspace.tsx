import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Plus,
  Search,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import { useDeferredValue, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listClasses, listSections } from "../../academic-structure/api/academic-structure.api";
import type { AcademicClass, Section } from "../../academic-structure/model/academic-structure.types";
import { listTenantTemplates } from "../../tenant-settings/api/settings.api";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import type { TenantTemplate } from "../../tenant-settings/model/settings.types";
import { TemplateFields } from "../../tenant-settings/ui/template-fields";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { listEnquiries } from "../api/enquiries.api";
import type { Enquiry } from "../model/enquiry.types";
import {
  approveApplication,
  cancelApplication,
  checkApplicationDuplicates,
  confirmApplication,
  createApplication,
  listApplicationPage,
  rejectApplication,
  submitApplication,
} from "../api/applications.api";
import type {
  AdmissionApplication,
  ApplicationDuplicateCheck,
  ApplicationStatus,
} from "../model/application.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { ServerPagination } from "../../../shared/ui/server-pagination";
import { getStudentByAdmissionApplicationId } from "../../students/api/students.api";

const statuses: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "CONFIRMED",
  "CANCELLED",
];

const SYSTEM_KEYS = [
  "studentName",
  "parentName",
  "phone",
  "campusId",
  "academicYearId",
  "academicTargetId",
  "sectionId",
];

const empty = {
  enquiryId: "",
  studentName: "",
  parentName: "",
  phone: "",
  academicTargetId: "",
  sectionId: "",
};

const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusVariant = (status: ApplicationStatus) => {
  switch (status) {
    case "DRAFT": return "secondary";
    case "SUBMITTED": return "default";
    case "APPROVED": return "brand";
    case "CONFIRMED": return "success";
    case "REJECTED":
    case "CANCELLED":
      return "destructive";
    default: return "secondary";
  }
};

export function ApplicationWorkspace({ confirmedOnly = false }: { confirmedOnly?: boolean }) {
  const navigate = useNavigate();
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [items, setItems] = useState<AdmissionApplication[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [template, setTemplate] = useState<TenantTemplate | null>(null);
  const [form, setForm] = useState(empty);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "">(confirmedOnly ? "CONFIRMED" : "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const deferredSearch = useDeferredValue(search);
  const [confirmation, setConfirmation] = useState<AdmissionApplication | null>(null);
  const [duplicateCheck, setDuplicateCheck] = useState<ApplicationDuplicateCheck | null>(null);
  const [resolvingStudentId, setResolvingStudentId] = useState("");

  const updateTemplateValue = (key: string, value: unknown) => {
    if (key in form) {
      setForm((current) => ({ ...current, [key]: String(value ?? "") }));
      return;
    }
    setCustomFields((current) => ({ ...current, [key]: value }));
  };

  const openConfirmedStudent = async (application: AdmissionApplication) => {
    try {
      setResolvingStudentId(application.id);
      setError(null);
      const student = await getStudentByAdmissionApplicationId(application.id);
      navigate(`/admin/students/${student.id}`);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to open the admitted student record");
    } finally {
      setResolvingStudentId("");
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [applications, leads, templates, classRows, sectionRows] = await Promise.all([
        listApplicationPage({
          ...(status ? { status } : {}),
          ...(selectedCampus ? { campusId: selectedCampus.id } : {}),
          ...(selectedAcademicYear ? { academicYearId: selectedAcademicYear.id } : {}),
          ...(deferredSearch.trim() ? { search: deferredSearch.trim() } : {}),
          page,
          pageSize,
        }),
        listEnquiries(),
        listTenantTemplates(),
        selectedCampus ? listClasses(selectedCampus.id) : [],
        selectedCampus ? listSections(selectedCampus.id) : [],
      ]);
      setItems(applications.items);
      setTotal(applications.total);
      setEnquiries(leads.filter((item) => item.status !== "CLOSED"));
      setTemplate(
        templates
          .filter((item) => item.status === "PUBLISHED" && item.layout === "APPLICATION_FORM")
          .sort(
            (left, right) =>
              (right.publishedVersion ?? right.version) -
              (left.publishedVersion ?? left.version),
          )[0] ?? null,
      );
      setClasses(classRows.filter((item) => item.status === "ACTIVE"));
      setSections(sectionRows.filter((item) => item.status === "ACTIVE"));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedCampus?.id, selectedAcademicYear?.id, deferredSearch, page, pageSize]);

  const selectEnquiry = (enquiryId: string) => {
    const enquiry = enquiries.find((item) => item.id === enquiryId);
    setForm((current) => ({
      ...current,
      enquiryId,
      studentName: enquiry?.studentName ?? current.studentName,
      parentName: enquiry?.parentName ?? current.parentName,
      phone: enquiry?.phone ?? current.phone,
      academicTargetId: enquiry?.academicTargetId ?? current.academicTargetId,
    }));
    setCustomFields((current) => ({
      ...current,
      ...(enquiry?.email ? { student_email: enquiry.email } : {}),
      ...(enquiry?.dateOfBirth ? { date_of_birth: enquiry.dateOfBirth.slice(0, 10) } : {}),
      ...(enquiry?.gender ? { gender: enquiry.gender } : {}),
    }));
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!template || !selectedCampus || !selectedAcademicYear) {
      setError("Publish an admission template and select a campus and academic year first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const emailValue = customFields.student_email ?? customFields.email,
        dobValue = customFields.date_of_birth ?? customFields.dateOfBirth,
        genderValue = customFields.gender,
        addressValue = customFields.address,
        parentPhoneValue = customFields.parent_phone ?? customFields.parentPhone,
        parentRelationValue = customFields.parent_relation ?? customFields.parentRelation;
      const saved = await createApplication({
        ...(form.enquiryId ? { enquiryId: form.enquiryId } : {}),
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        academicTargetId: form.academicTargetId,
        ...(form.sectionId ? { sectionId: form.sectionId } : {}),
        studentName: form.studentName,
        parentName: form.parentName,
        phone: form.phone,
        ...(typeof emailValue === "string" && emailValue.trim() ? { email: emailValue.trim() } : {}),
        ...(typeof dobValue === "string" && dobValue
          ? { dateOfBirth: new Date(`${dobValue.slice(0, 10)}T00:00:00.000Z`).toISOString() }
          : {}),
        ...(typeof genderValue === "string" &&
        ["MALE", "FEMALE", "OTHER"].includes(genderValue.toUpperCase())
          ? { gender: genderValue.toUpperCase() as "MALE" | "FEMALE" | "OTHER" }
          : {}),
        ...(typeof addressValue === "string" && addressValue.trim() ? { address: addressValue.trim() } : {}),
        ...(typeof parentPhoneValue === "string" && parentPhoneValue.trim()
          ? { parentPhone: parentPhoneValue.trim() }
          : {}),
        ...(typeof parentRelationValue === "string" && parentRelationValue.trim()
          ? { parentRelation: parentRelationValue.trim() }
          : {}),
        templateId: template.id,
        templateVersion: template.publishedVersion ?? template.version,
        customFields,
      });
      setItems((current) => (page === 1 ? [saved, ...current].slice(0, pageSize) : current));
      setTotal((current) => current + 1);
      setPage(1);
      setForm(empty);
      setCustomFields({});
      setOpen(false);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to create application");
    } finally {
      setBusy(false);
    }
  };

  const replace = (saved: AdmissionApplication) =>
    setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)));

  const act = async (item: AdmissionApplication, action: "submit" | "approve" | "reject" | "cancel") => {
    const reason =
      action === "reject"
        ? window.prompt("Reason for rejection")
        : action === "cancel"
          ? window.prompt("Reason for cancellation")
          : undefined;
    if ((action === "reject" || action === "cancel") && !reason?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      replace(
        action === "submit"
          ? await submitApplication(item.id)
          : action === "approve"
            ? await approveApplication(item.id, "Application and submitted records verified")
            : action === "reject"
              ? await rejectApplication(item.id, reason!)
              : await cancelApplication(item.id, reason!),
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update application");
    } finally {
      setBusy(false);
    }
  };

  const reviewForConfirmation = async (item: AdmissionApplication) => {
    setBusy(true);
    setError(null);
    try {
      setDuplicateCheck(await checkApplicationDuplicates(item.id));
      setConfirmation(item);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to complete duplicate review");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!confirmation || !duplicateCheck) return;
    setBusy(true);
    setError(null);
    try {
      replace(await confirmApplication(confirmation.id, duplicateCheck.hasPotentialDuplicates));
      setConfirmation(null);
      setDuplicateCheck(null);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Admission confirmation failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Loading admission applications" />;
  if (error && !items.length && !template) return <ErrorState message={error} retry={() => void load()} />;

  const draftCount = items.filter((i) => i.status === "DRAFT").length;
  const reviewCount = items.filter((i) => ["SUBMITTED", "APPROVED"].includes(i.status)).length;
  const confirmedCount = items.filter((i) => i.status === "CONFIRMED").length;

  return (
    <section className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Top Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {confirmedOnly ? "Admitted Students" : "Admission Applications"}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {confirmedOnly
              ? `Review confirmed admissions and view student profile directory records for ${selectedCampus?.name ?? "Campus"}`
              : `Prepare, review, approve, and confirm student admissions for ${selectedCampus?.name ?? "Campus"}`}
          </p>
        </div>

        {!confirmedOnly && (
          <Button
            size="sm"
            disabled={!template || !selectedCampus || !selectedAcademicYear}
            onClick={() => setOpen(true)}
            className="h-9 px-4 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Application
          </Button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs">
          {error}
        </div>
      )}

      {!template && !confirmedOnly && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 shadow-xs">
          Publish an admission form template under Setup → Templates before creating new applications.
        </div>
      )}

      {/* 4 KPI Summary Cards Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {confirmedOnly ? "Total Admitted" : "Total Applications"}
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 leading-none">{total}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            {confirmedOnly ? "Confirmed student enrollments" : "All application records"}
          </div>
        </div>

        {!confirmedOnly && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
              <div className="h-5 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Drafts
                </span>
                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <FileText className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 leading-none">{draftCount}</div>
              <div className="text-[11px] text-slate-500 font-medium leading-none">Incomplete draft applications</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
              <div className="h-5 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Under Review
                </span>
                <div className="h-7 w-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <FileCheck2 className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-600 leading-none">{reviewCount}</div>
              <div className="text-[11px] text-slate-500 font-medium leading-none">Submitted / Verified applications</div>
            </div>
          </>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Confirmed Admissions
            </span>
            <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 leading-none">{confirmedCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">Active student directory records</div>
        </div>
      </div>

      {/* Toolbar Filter Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            aria-label="Search applications"
            placeholder="Search applicant name, parent, phone or application #"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {!confirmedOnly && (
            <select
              aria-label="Filter application status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ApplicationStatus | "");
                setPage(1);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          )}

          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 whitespace-nowrap">
            {total} Record{total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Data Table Container */}
      {items.length ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3">Applicant Name</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Target Class</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Parent & Contact</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Status</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {item.studentName.charAt(0)}
                      </div>
                      <div>
                        {confirmedOnly ? (
                          <button
                            type="button"
                            className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors text-left"
                            onClick={() => void openConfirmedStudent(item)}
                          >
                            {item.studentName}
                          </button>
                        ) : (
                          <Link
                            className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors"
                            to={`/admin/admissions/applications/${item.id}`}
                          >
                            {item.studentName}
                          </Link>
                        )}
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.status === "CONFIRMED" && item.admissionNumber
                            ? `Adm: ${item.admissionNumber} • App: ${item.applicationNumber}`
                            : (item.applicationNumber ?? "Draft · App # assigned on submit")}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3 text-xs">
                    <Badge variant="secondary" className="font-semibold">
                      {classes.find((row) => row.id === item.academicTargetId)?.name ?? "—"}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3 text-xs">
                    <p className="font-semibold text-slate-800">{item.phone}</p>
                    <p className="text-[11px] text-slate-400">Parent: {item.parentName}</p>
                  </TableCell>

                  <TableCell className="py-3 text-xs">
                    <Badge variant={getStatusVariant(item.status)}>
                      {label(item.status)}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {confirmedOnly ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                          disabled={resolvingStudentId === item.id}
                          onClick={() => void openConfirmedStudent(item)}
                        >
                          {resolvingStudentId === item.id ? "Opening..." : "View Student"}
                        </Button>
                      ) : (
                        <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold">
                          <Link to={`/admin/admissions/applications/${item.id}`}>View Details</Link>
                        </Button>
                      )}

                      {item.status === "DRAFT" && !confirmedOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void act(item, "submit")}
                          className="h-8 px-2.5 text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Submit
                        </Button>
                      )}

                      {item.status === "SUBMITTED" && !confirmedOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void act(item, "approve")}
                          className="h-8 px-2.5 text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50/50 hover:bg-purple-100"
                        >
                          <FileCheck2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      )}

                      {item.status === "APPROVED" && !confirmedOnly && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void reviewForConfirmation(item)}
                          className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Confirm Admission
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t border-slate-200 p-3 bg-slate-50">
            <ServerPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        <EmptyState
          title={confirmedOnly ? "No admitted students" : "No applications found"}
          description={
            confirmedOnly
              ? "Confirmed admission applications will automatically sync and display here."
              : "Create a new admission application or change selected search filters."
          }
        />
      )}

      {/* Modal for Creating Application */}
      <Modal
        open={open}
        title="New Admission Application"
        description={`${template?.name ?? "Application Form"} • ${selectedCampus?.name ?? "No Campus"} • ${selectedAcademicYear?.name ?? "No Academic Year"}`}
        className="sm:max-w-3xl"
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void create(e)} className="space-y-4 font-sans text-xs">
          {enquiries.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Link to Enquiry (Optional)</Label>
              <select
                value={form.enquiryId}
                onChange={(e) => selectEnquiry(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select from prospective enquiries</option>
                {enquiries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.studentName} • Parent: {item.parentName} ({item.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {template && (
            <div className="pt-1">
              <TemplateFields
                template={template}
                values={{
                  ...customFields,
                  ...form,
                  campusId: selectedCampus?.id ?? "",
                  academicYearId: selectedAcademicYear?.id ?? "",
                }}
                systemKeys={SYSTEM_KEYS}
                scope="APPLICATION"
                onChange={updateTemplateValue}
                renderSystemField={(field) => {
                  if (field.key === "academicTargetId") {
                    return (
                      <select
                        required={field.required}
                        value={form.academicTargetId}
                        onChange={(event) => setForm((current) => ({ ...current, academicTargetId: event.target.value, sectionId: "" }))}
                        className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select target class</option>
                        {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    );
                  }
                  if (field.key === "sectionId") {
                    return (
                      <select
                        required={field.required}
                        value={form.sectionId}
                        onChange={(event) => setForm((current) => ({ ...current, sectionId: event.target.value }))}
                        className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select section</option>
                        {sections.filter((item) => !form.academicTargetId || item.classId === form.academicTargetId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    );
                  }
                  if (field.key === "campusId" || field.key === "academicYearId") {
                    return <Input value={field.key === "campusId" ? selectedCampus?.name ?? "" : selectedAcademicYear?.name ?? ""} disabled />;
                  }
                  return null;
                }}
              />
            </div>
          )}

          <Separator />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} className="h-9 text-xs font-semibold">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy} className="h-9 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">
              Create Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Duplicate Check Review Modal for Confirmation */}
      {confirmation && duplicateCheck && (
        <Modal
          open={!!confirmation}
          title="Confirm Admission"
          description={`Applicant: ${confirmation.studentName} • ${confirmation.applicationNumber}`}
          onClose={() => setConfirmation(null)}
        >
          <div className="space-y-4 text-xs font-sans">
            {duplicateCheck.hasPotentialDuplicates ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Potential Duplicate Records Detected</p>
                  <p className="mt-0.5 text-[11px]">
                    Matching student records found in the database. Please review before proceeding.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2.5 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold">No Duplicates Found</p>
                  <p className="mt-0.5 text-[11px]">
                    Ready to confirm admission and generate an active student record in Student Directory.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmation(null)} className="h-9 text-xs font-semibold">
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void confirm()}
                className="h-9 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Confirm Admission
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
