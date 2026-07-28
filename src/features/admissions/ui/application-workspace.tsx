import { AlertTriangle, Check, FileCheck2, Plus, Search, Send, XCircle } from "lucide-react";
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
          .filter(
            (item) =>
              item.status === "PUBLISHED" &&
              (item.layout === "APPLICATION_FORM" ||
                (item.layout === "ADMISSION_FORM" && item.name.toLowerCase().includes("application"))),
          )
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

  useEffect(() => {
    setPage(1);
  }, [selectedCampus?.id, selectedAcademicYear?.id]);

  const availableSections = sections.filter((item) => item.classId === form.academicTargetId);

  const chooseEnquiry = (id: string) => {
    const enquiry = enquiries.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      enquiryId: id,
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
      setItems((current) => page === 1 ? [saved, ...current].slice(0, pageSize) : current);
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

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{confirmedOnly ? "Admitted students" : "Admission applications"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {confirmedOnly ? "Review confirmed admissions and open the complete admission record." : "Prepare, submit, review and confirm applications for the selected campus."}
          </p>
        </div>
        {!confirmedOnly && <Button
          size="sm"
          variant="brand"
          disabled={!template || !selectedCampus || !selectedAcademicYear}
          onClick={() => setOpen(true)}
          className="h-8 text-xs font-bold"
        >
          <Plus size={14} />
          New application
        </Button>}
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!template && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Publish an admission form under Setup → Templates before creating applications.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            aria-label="Search applications"
            placeholder="Search applicant, parent, phone or number"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        {!confirmedOnly && <select
          aria-label="Filter application status"
          value={status}
          onChange={(event) => { setStatus(event.target.value as ApplicationStatus | ""); setPage(1); }}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
        >
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>}
        <span className="text-sm text-slate-500">{total} applications</span>
      </div>

      {/* Data Table */}
      {items.length ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Academic target</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer">
                  <TableCell>
                    <div>
                      {confirmedOnly ? (
                        <button className="font-semibold text-slate-900 hover:text-accent-700" onClick={() => void openConfirmedStudent(item)}>
                          {item.studentName}
                        </button>
                      ) : (
                        <Link className="font-semibold text-slate-900 hover:text-accent-700" to={`/admin/admissions/applications/${item.id}`}>{item.studentName}</Link>
                      )}
                      <p className="text-xs text-slate-500">
                        {item.status === "CONFIRMED" && item.admissionNumber
                          ? `${item.admissionNumber} · ${item.applicationNumber}`
                          : (item.applicationNumber ?? "Draft · number assigned on submission")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-650 text-sm">
                    {classes.find((row) => row.id === item.academicTargetId)?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-750 font-semibold">{item.phone}</p>
                    <p className="text-xs text-slate-500">Parent: {item.parentName}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status)}>
                      {label(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {confirmedOnly ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          disabled={resolvingStudentId === item.id}
                          onClick={() => void openConfirmedStudent(item)}
                        >
                          {resolvingStudentId === item.id ? "Opening..." : "View student"}
                        </Button>
                      ) : (
                        <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                          <Link to={`/admin/admissions/applications/${item.id}`}>View</Link>
                        </Button>
                      )}
                      {item.status === "DRAFT" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void act(item, "submit")}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Send size={13} />
                          Submit
                        </Button>
                      )}
                      {item.status === "SUBMITTED" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void act(item, "approve")}
                            className="h-8 px-2.5 text-xs text-emerald-600 hover:text-emerald-700"
                          >
                            <Check size={13} />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Reject application"
                            disabled={busy}
                            onClick={() => void act(item, "reject")}
                            className="text-slate-400 hover:text-red-650"
                          >
                            <XCircle size={15} />
                          </Button>
                        </>
                      )}
                      {["DRAFT", "SUBMITTED", "REJECTED"].includes(item.status) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Cancel application"
                          disabled={busy}
                          onClick={() => void act(item, "cancel")}
                          className="text-slate-400 hover:text-red-650"
                        >
                          <XCircle size={15} />
                        </Button>
                      )}
                      {item.status === "APPROVED" && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void reviewForConfirmation(item)}
                          className="h-8 px-2.5 text-xs"
                        >
                          <FileCheck2 size={13} />
                          Confirm admission
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ServerPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
          />
        </div>
      ) : (
        <EmptyState
          title="No applications found"
          description="Create an application from an enquiry or start a direct application."
        />
      )}

      {/* New Application Modal */}
      <Modal
        open={open}
        title="New admission application"
        description={`${template?.name ?? "Admission form"} · ${selectedCampus?.name ?? "No campus"} · ${selectedAcademicYear?.name ?? "No academic year"}`}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void create(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="from-enquiry">Start from enquiry <small className="text-slate-400">(optional)</small></Label>
            <select
              id="from-enquiry"
              value={form.enquiryId}
              onChange={(e) => chooseEnquiry(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="">Direct application</option>
              {enquiries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.studentName} · {item.phone}
                </option>
              ))}
            </select>
          </div>

          {template && (
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
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          academicTargetId: event.target.value,
                          sectionId: "",
                        }))
                      }
                      className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                    >
                      <option value="">Select academic target</option>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  );
                }
                if (field.key === "sectionId") {
                  return (
                    <select
                      required={field.required}
                      value={form.sectionId}
                      disabled={!form.academicTargetId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, sectionId: event.target.value }))
                      }
                      className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-50"
                    >
                      <option value="">Assign after confirmation</option>
                      {availableSections.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  );
                }
                if (field.key === "campusId" || field.key === "academicYearId") {
                  return (
                    <Input
                      value={
                        field.key === "campusId"
                          ? selectedCampus?.name ?? ""
                          : selectedAcademicYear?.name ?? ""
                      }
                      disabled
                    />
                  );
                }
                return null;
              }}
            />
          )}

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy || !template}>
              Save draft
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation & Duplicate Check Modal */}
      <Modal
        open={Boolean(confirmation && duplicateCheck)}
        title="Confirm admission"
        {...(confirmation
          ? {
              description: `${confirmation.studentName} · ${confirmation.applicationNumber ?? "Approved application"}`,
            }
          : {})}
        onClose={() => {
          setConfirmation(null);
          setDuplicateCheck(null);
        }}
      >
        {confirmation && duplicateCheck ? (
          <div className="space-y-4">
            {duplicateCheck.hasPotentialDuplicates ? (
              <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block font-semibold">Potential duplicate records found</strong>
                  <p className="mt-0.5 text-xs text-red-650 leading-relaxed">
                    Review the records below. This is a warning, not an automatic rejection.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-250 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
                <Check size={16} /> No matching application or admitted-student record was found.
              </div>
            )}

            {duplicateCheck.matches.map((match) => (
              <div
                key={match.applicationId}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <div>
                  <strong className="block text-slate-805 font-bold">{match.studentName}</strong>
                  <span className="text-xs text-slate-400 font-mono">
                    {match.admissionNumber ?? match.applicationNumber ?? "Draft record"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={getStatusVariant(match.status)}>
                    {label(match.status)}
                  </Badge>
                  <span className="text-[10px] text-slate-450">{match.reasons.map(label).join(" · ")}</span>
                </div>
              </div>
            ))}

            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-md p-3">
              Confirmation assigns the admission number and starts asynchronous student enrollment and fee-order generation. It cannot be treated as a draft action.
            </p>

            <Separator />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmation(null);
                  setDuplicateCheck(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void confirm()}
              >
                <FileCheck2 size={15} />
                {busy
                  ? "Confirming..."
                  : duplicateCheck.hasPotentialDuplicates
                    ? "Acknowledge and confirm"
                    : "Confirm admission"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
