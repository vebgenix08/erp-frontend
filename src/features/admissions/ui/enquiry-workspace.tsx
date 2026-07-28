import { CheckCircle2, PhoneCall, Plus, Search, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { listClasses } from "../../academic-structure/api/academic-structure.api";
import type { AcademicClass } from "../../academic-structure/model/academic-structure.types";
import { listTenantTemplates } from "../../tenant-settings/api/settings.api";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import type { TenantTemplate } from "../../tenant-settings/model/settings.types";
import { TemplateFields } from "../../tenant-settings/ui/template-fields";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  closeEnquiry,
  createEnquiry,
  listEnquiryPage,
  updateEnquiry,
} from "../api/enquiries.api";
import type { Enquiry, EnquiryStatus } from "../model/enquiry.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { ServerPagination } from "../../../shared/ui/server-pagination";

const statuses: EnquiryStatus[] = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "CLOSED"];

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
    case "NEW": return "warning";
    case "CONTACTED": return "default";
    case "FOLLOW_UP": return "brand";
    case "CONVERTED": return "success";
    case "CLOSED": return "secondary";
    default: return "secondary";
  }
};

export function EnquiryWorkspace() {
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [items, setItems] = useState<Enquiry[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [template, setTemplate] = useState<TenantTemplate | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EnquiryStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
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
          ...(status ? { status } : {}),
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
          .filter(
            (item) =>
              item.status === "PUBLISHED" &&
              (item.layout === "ENQUIRY_FORM" ||
                (item.layout === "ADMISSION_FORM" && item.name.toLowerCase().includes("enquiry"))),
          )
          .sort(
            (left, right) =>
              (right.publishedVersion ?? right.version) -
              (left.publishedVersion ?? left.version),
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
  }, [status, search, page, pageSize, selectedCampus?.id, selectedAcademicYear?.id]);

  useEffect(() => {
    setPage(1);
  }, [selectedCampus?.id, selectedAcademicYear?.id]);

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

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Enquiry management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Capture prospective students for the selected campus and academic year.
          </p>
        </div>
        <Button
          size="sm"
          variant="brand"
          disabled={!template || !selectedCampus || !selectedAcademicYear}
          onClick={() => setOpen(true)}
          className="h-8 text-xs font-bold"
        >
          <Plus size={14} />
          New enquiry
        </Button>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!template && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Publish an admission form under Setup → Templates before capturing enquiries.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            aria-label="Search enquiries"
            placeholder="Search student, parent, phone or number"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filter enquiry status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as EnquiryStatus | "");
            setPage(1);
          }}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
        >
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{total} enquiries</span>
      </div>

      {/* Data Table */}
      {items.length ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospective student</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-900">{item.studentName}</p>
                      <p className="text-xs text-slate-500">
                        {item.enquiryNumber} · Parent: {item.parentName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-700">{item.phone}</p>
                    <p className="text-xs text-slate-500">{item.email || "No email"}</p>
                  </TableCell>
                  <TableCell className="text-slate-650 text-sm">
                    {item.interestedClass || "Not selected"}
                  </TableCell>
                  <TableCell className="text-slate-650 text-sm">
                    {item.source || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status)}>
                      {label(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {item.status === "NEW" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void changeStatus(item, "CONTACTED")}
                          className="h-8 py-1 px-2.5 text-xs"
                        >
                          <PhoneCall size={13} />
                          Contacted
                        </Button>
                      )}
                      {["CONTACTED", "FOLLOW_UP"].includes(item.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void changeStatus(item, "CONVERTED")}
                          className="h-8 py-1 px-2.5 text-xs text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckCircle2 size={13} />
                          Convert
                        </Button>
                      )}
                      {!["CLOSED", "CONVERTED"].includes(item.status) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Close enquiry"
                          aria-label={`Close enquiry for ${item.studentName}`}
                          disabled={busy}
                          onClick={() => void changeStatus(item, "CLOSED")}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <XCircle size={15} />
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
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </div>
      ) : (
        <EmptyState
          title="No enquiries found"
          description="Create the first enquiry or change the selected filters."
        />
      )}

      {/* Modal for creating enquiry */}
      <Modal
        open={open}
        title="New enquiry"
        description={`${template?.name ?? "Admission form"} · ${selectedCampus?.name ?? "No campus"} · ${selectedAcademicYear?.name ?? "No academic year"}`}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
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
            <Button type="submit" size="sm" disabled={busy}>
              Create enquiry
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
