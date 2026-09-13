import {
  CheckCircle2,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { listClasses } from "../../academic-structure/api/academic-structure.api";
import type { AcademicClass } from "../../academic-structure/model/academic-structure.types";
import { listTenantTemplates } from "../../tenant-settings/api/settings.api";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import type { TenantTemplate } from "../../tenant-settings/model/settings.types";
import { TemplateFields } from "../../tenant-settings/ui/template-fields";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { closeEnquiry, createEnquiry, listEnquiryPage, updateEnquiry } from "../api/enquiries.api";
import type { Enquiry, EnquiryStatus } from "../model/enquiry.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { ModernSelect } from "../../../shared/ui/select";
import { Badge } from "../../../shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { ServerPagination } from "../../../shared/ui/server-pagination";

const statuses: EnquiryStatus[] = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "CLOSED"];
const sources = [
  "Walk-in",
  "Newspaper Ad",
  "Social Media",
  "Friend / Relative",
  "Google Search",
  "School Banner",
  "Website",
  "Referral",
];
const pageSizes = new Set([10, 25, 50, 100]);

const positiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const startOfDate = (value: string) => `${value}T00:00:00.000Z`;
const endOfDate = (value: string) => `${value}T23:59:59.999Z`;

const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const emptyForm = {
  studentName: "",
  parentName: "",
  phone: "",
  email: "",
  academicTargetId: "",
  notes: "",
};

const SYSTEM_KEYS = [
  "studentName",
  "parentName",
  "phone",
  "email",
  "notes",
  "campusId",
  "academicYearId",
  "academicTargetId",
];

const getStatusVariant = (status: EnquiryStatus) => {
  switch (status) {
    case "NEW":
      return "warning";
    case "CONTACTED":
      return "default";
    case "FOLLOW_UP":
      return "brand";
    case "CONVERTED":
      return "success";
    case "CLOSED":
      return "secondary";
    default:
      return "secondary";
  }
};

export function EnquiryWorkspace() {
  const [query, setQuery] = useSearchParams();
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const operatingContextRef = useRef(
    `${selectedCampus?.id ?? ""}:${selectedAcademicYear?.id ?? ""}`,
  );
  const [items, setItems] = useState<Enquiry[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [template, setTemplate] = useState<TenantTemplate | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = query.get("search") ?? "";
  const [draftSearch, setDraftSearch] = useState(search);
  const rawStatus = query.get("status") ?? "";
  const status = statuses.includes(rawStatus as EnquiryStatus) ? (rawStatus as EnquiryStatus) : "";
  const academicTargetId = query.get("classId") ?? "";
  const source = query.get("source") ?? "";
  const createdFrom = query.get("from") ?? "";
  const createdTo = query.get("to") ?? "";
  const page = positiveInteger(query.get("page"), 1);
  const requestedPageSize = positiveInteger(query.get("pageSize"), 25);
  const pageSize = pageSizes.has(requestedPageSize) ? requestedPageSize : 25;
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [enquiries, templates, academicClasses] = await Promise.all([
        listEnquiryPage({
          ...(selectedCampus ? { campusId: selectedCampus.id } : {}),
          ...(selectedAcademicYear ? { academicYearId: selectedAcademicYear.id } : {}),
          ...(academicTargetId ? { academicTargetId } : {}),
          ...(status ? { status } : {}),
          ...(source ? { source } : {}),
          ...(createdFrom ? { createdFrom: startOfDate(createdFrom) } : {}),
          ...(createdTo ? { createdTo: endOfDate(createdTo) } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        listTenantTemplates(),
        selectedCampus ? listClasses(selectedCampus.id) : Promise.resolve([]),
      ]);
      setItems(enquiries.items);
      setTotal(enquiries.total);
      setClasses(academicClasses.filter((item) => item.status === "ACTIVE"));
      setTemplate(
        templates
          .filter((item) => item.status === "PUBLISHED" && item.layout === "ENQUIRY_FORM")
          .sort(
            (left, right) =>
              (right.publishedVersion ?? right.version) - (left.publishedVersion ?? left.version),
          )[0] ?? null,
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    academicTargetId,
    createdFrom,
    createdTo,
    status,
    source,
    search,
    page,
    pageSize,
    selectedCampus?.id,
    selectedAcademicYear?.id,
  ]);

  useEffect(() => {
    const currentContext = `${selectedCampus?.id ?? ""}:${selectedAcademicYear?.id ?? ""}`;
    if (operatingContextRef.current === currentContext) return;
    operatingContextRef.current = currentContext;
    const next = new URLSearchParams(query);
    next.set("page", "1");
    setQuery(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampus?.id, selectedAcademicYear?.id]);

  useEffect(() => setDraftSearch(search), [search]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftSearch === search) return;
      const next = new URLSearchParams(query);
      if (draftSearch.trim()) next.set("search", draftSearch.trim());
      else next.delete("search");
      next.set("page", "1");
      setQuery(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draftSearch, query, search, setQuery]);

  const updateQuery = (updates: Record<string, string | number | undefined>, resetPage = true) => {
    const next = new URLSearchParams(query);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage && !("page" in updates)) next.set("page", "1");
    setQuery(next, { replace: true });
  };

  const updateTemplateValue = (key: string, value: unknown) => {
    if (key in form) {
      setForm((current) => ({ ...current, [key]: String(value ?? "") }));
      return;
    }
    setCustomFields((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!template || !selectedCampus || !selectedAcademicYear) {
      setError("A published admission template, campus and academic year are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const email = form.email.trim();
      const notes = form.notes.trim();
      const academicClass = classes.find((item) => item.id === form.academicTargetId);
      const source =
        typeof customFields.admission_source === "string"
          ? customFields.admission_source
          : undefined;
      await createEnquiry({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        academicTargetId: form.academicTargetId,
        studentName: form.studentName,
        parentName: form.parentName,
        phone: form.phone,
        ...(academicClass ? { interestedClass: academicClass.name } : {}),
        templateId: template.id,
        templateVersion: template.publishedVersion ?? template.version,
        customFields,
        ...(email ? { email } : {}),
        ...(source ? { source } : {}),
        ...(notes ? { notes } : {}),
      });
      await load();
      setOpen(false);
      setForm(emptyForm);
      setCustomFields({});
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to create enquiry");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (item: Enquiry, next: EnquiryStatus) => {
    setBusy(true);
    setError(null);
    try {
      const saved =
        next === "CLOSED"
          ? await closeEnquiry(item.id)
          : await updateEnquiry(item.id, { status: next });
      setItems((current) => current.map((value) => (value.id === saved.id ? saved : value)));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update enquiry");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Loading enquiries" />;
  if (error && !items.length && !template)
    return <ErrorState message={error} retry={() => void load()} />;

  const newCount = items.filter((i) => i.status === "NEW").length;
  const followCount = items.filter((i) => ["CONTACTED", "FOLLOW_UP"].includes(i.status)).length;
  const convertedCount = items.filter((i) => i.status === "CONVERTED").length;

  return (
    <section className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Top Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admission Enquiries</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Capture and track prospective students for {selectedCampus?.name ?? "Campus"} (
            {selectedAcademicYear?.name ?? "Academic Year"})
          </p>
        </div>
        <Button
          size="sm"
          disabled={!template || !selectedCampus || !selectedAcademicYear}
          onClick={() => setOpen(true)}
          className="h-9 px-4 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Enquiry
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs"
        >
          {error}
        </div>
      )}

      {!template && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 shadow-xs"
        >
          Publish an admission form template under Setup → Templates before capturing new enquiries.
        </div>
      )}

      {/* 4 KPI Summary Cards Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Enquiries
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 leading-none">{total}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            Overall leads recorded
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              New Leads
            </span>
            <div className="h-7 w-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 leading-none">{newCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            Awaiting initial contact
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              In Follow-Up
            </span>
            <div className="h-7 w-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <PhoneCall className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 leading-none">{followCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            Active follow-ups in progress
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Converted
            </span>
            <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 leading-none">{convertedCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            Converted to application
          </div>
        </div>
      </div>

      {/* Toolbar Filter Card */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            aria-label="Search enquiries"
            placeholder="Search student name, parent, phone or enquiry #"
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <ModernSelect
          aria-label="Filter enquiry status"
          value={status}
          onValueChange={(val) => updateQuery({ status: val })}
          placeholder="All Statuses"
          className="w-[140px]"
          options={[
            { label: "All Statuses", value: "" },
            ...statuses.map((value) => ({ label: label(value), value })),
          ]}
        />

        <ModernSelect
          aria-label="Filter enquiry class"
          value={academicTargetId}
          onValueChange={(val) => updateQuery({ classId: val })}
          placeholder="All Classes"
          className="w-[140px]"
          options={[
            { label: "All Classes", value: "" },
            ...classes.map((item) => ({ label: item.name, value: item.id })),
          ]}
        />

        <ModernSelect
          aria-label="Filter enquiry source"
          value={source}
          onValueChange={(val) => updateQuery({ source: val })}
          placeholder="All Sources"
          className="w-[140px]"
          options={[
            { label: "All Sources", value: "" },
            ...sources.map((value) => ({ label: value, value })),
          ]}
        />
        <Input
          aria-label="Enquiries from date"
          title="Created from"
          type="date"
          value={createdFrom}
          onChange={(event) => updateQuery({ from: event.target.value })}
          className="h-9 w-[145px]"
        />
        <Input
          aria-label="Enquiries to date"
          title="Created to"
          type="date"
          min={createdFrom || undefined}
          value={createdTo}
          onChange={(event) => updateQuery({ to: event.target.value })}
          className="h-9 w-[145px]"
        />
        {(search || status || academicTargetId || source || createdFrom || createdTo) && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-semibold"
            onClick={() => {
              setDraftSearch("");
              setQuery(new URLSearchParams({ page: "1", pageSize: String(pageSize) }), {
                replace: true,
              });
            }}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 whitespace-nowrap">
          {total} Record{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Data Table Container */}
      {items.length ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3">
                  Prospective Student
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">
                  Contact Details
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">
                  Interested Class
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Lead Source</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Status</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3 text-right">
                  Actions
                </TableHead>
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
                        <p className="font-bold text-slate-900 text-xs">{item.studentName}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.enquiryNumber} • Parent: {item.parentName}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3 text-xs">
                    <p className="font-semibold text-slate-800">{item.phone}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.email || "No email provided"}
                    </p>
                  </TableCell>

                  <TableCell className="py-3 text-xs font-semibold text-slate-700">
                    <Badge variant="secondary" className="font-semibold">
                      {item.interestedClass || "Not selected"}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3 text-xs font-medium text-slate-600">
                    {item.source || "—"}
                  </TableCell>

                  <TableCell className="py-3 text-xs">
                    <Badge variant={getStatusVariant(item.status)}>{label(item.status)}</Badge>
                  </TableCell>

                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === "NEW" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void changeStatus(item, "CONTACTED")}
                          className="h-8 px-2.5 text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                        >
                          <PhoneCall className="h-3.5 w-3.5 mr-1" />
                          Contacted
                        </Button>
                      )}

                      {["CONTACTED", "FOLLOW_UP"].includes(item.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void changeStatus(item, "CONVERTED")}
                          className="h-8 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Convert
                        </Button>
                      )}

                      {!["CLOSED", "CONVERTED"].includes(item.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Close enquiry"
                          aria-label={`Close enquiry for ${item.studentName}`}
                          disabled={busy}
                          onClick={() => void changeStatus(item, "CLOSED")}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <XCircle className="h-4 w-4" />
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
              onPageChange={(value) => updateQuery({ page: value }, false)}
              onPageSizeChange={(value) => {
                updateQuery({ pageSize: value, page: 1 }, false);
              }}
            />
          </div>
        </div>
      ) : (
        <EmptyState
          title="No enquiries found"
          description="Create your first admission enquiry or adjust the search/filter options."
        />
      )}

      {/* Modal for Creating Enquiry */}
      <Modal
        open={open}
        title="New Admission Enquiry"
        description={`${template?.name ?? "Admission Form"} • ${selectedCampus?.name ?? "No Campus"} • ${selectedAcademicYear?.name ?? "No Academic Year"}`}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4 font-sans text-xs">
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
              scope="ENQUIRY"
              onChange={updateTemplateValue}
              renderField={(field) => {
                if (field.label.toLowerCase().includes("current class")) {
                  return (
                    <Input
                      required={field.required}
                      value={String(customFields[field.key] ?? "")}
                      placeholder="Enter current class, grade, year or semester"
                      onChange={(event) => updateTemplateValue(field.key, event.target.value)}
                      className="h-9 text-xs"
                    />
                  );
                }
                if (field.key === "academicTargetId") {
                  return (
                    <select
                      required={field.required}
                      value={form.academicTargetId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          academicTargetId: event.target.value,
                        }))
                      }
                      className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select target class</option>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  );
                }
                if (field.key === "campusId" || field.key === "academicYearId") {
                  return (
                    <Input
                      value={
                        field.key === "campusId"
                          ? (selectedCampus?.name ?? "")
                          : (selectedAcademicYear?.name ?? "")
                      }
                      disabled
                      className="h-9 text-xs"
                    />
                  );
                }
                return null;
              }}
            />
          )}

          <Separator />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy}
              className="h-9 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Create Enquiry
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
