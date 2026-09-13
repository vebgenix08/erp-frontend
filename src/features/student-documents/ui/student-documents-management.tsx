import { useCallback, useEffect, useState } from "react";
import {
  Award,
  CreditCard,
  Download,
  FileBadge,
  FileCheck2,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { listStudents } from "../../students/api/students.api";
import type { Student } from "../../students/model/student.types";
import { listClasses, listSections } from "../../academic-structure/api/academic-structure.api";
import type {
  AcademicClass,
  Section,
} from "../../academic-structure/model/academic-structure.types";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import {
  downloadStudentDocument,
  issueStudentDocument,
  listStudentDocumentPage,
  revokeStudentDocument,
} from "../api/student-documents.api";
import type { StudentDocument, StudentDocumentType } from "../model/student-document.types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { ModernSelect } from "../../../shared/ui/select";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, LoadingState } from "../../../shared/ui/page-state";
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

const types: Array<[StudentDocumentType, string, LucideIcon]> = [
  ["BONAFIDE_CERTIFICATE", "Bonafide Certificate", Award],
  ["STUDY_CERTIFICATE", "Study Certificate", FileText],
  ["TRANSFER_CERTIFICATE", "Transfer Certificate", FileCheck2],
  ["STUDENT_ID_CARD", "Student ID Card", CreditCard],
];

export function StudentDocumentsManagement() {
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [rows, setRows] = useState<StudentDocument[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTypeTab, setSelectedTypeTab] = useState<StudentDocumentType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageData, setPageData] = useState({
    total: 0,
    totalPages: 1,
    summary: { total: 0, certificates: 0, idCards: 0, revoked: 0 },
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [documentType, setDocumentType] = useState<StudentDocumentType>("BONAFIDE_CERTIFICATE");
  const [purpose, setPurpose] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const load = useCallback(async () => {
    if (!selectedCampus || !selectedAcademicYear) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, classRows, sectionRows] = await Promise.all([
        listStudentDocumentPage({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          ...(selectedTypeTab !== "ALL" ? { documentType: selectedTypeTab } : {}),
          ...(statusFilter !== "ALL" ? { status: statusFilter as "ISSUED" | "REVOKED" } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
          page,
          pageSize,
        }),
        listClasses(selectedCampus.id),
        listSections(selectedCampus.id),
      ]);
      setRows(data.items);
      setPageData({ total: data.total, totalPages: data.totalPages, summary: data.summary });
      setClasses(classRows);
      setSections(sectionRows);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load certificates and ID cards");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, selectedAcademicYear, selectedCampus, selectedTypeTab, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open || !selectedCampus || !selectedAcademicYear) return;
    const timeout = window.setTimeout(() => {
      setLoadingStudents(true);
      void listStudents({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        status: "ACTIVE",
        ...(studentSearch.trim() ? { search: studentSearch.trim() } : {}),
        limit: 50,
      })
        .then(setStudents)
        .catch((value) =>
          setError(value instanceof Error ? value.message : "Unable to search students"),
        )
        .finally(() => setLoadingStudents(false));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [open, selectedAcademicYear, selectedCampus, studentSearch]);

  const issue = async () => {
    if (!studentId) return;
    setBusy(true);
    setError(null);
    try {
      await issueStudentDocument({
        studentId,
        documentType,
        ...(purpose.trim() ? { purpose: purpose.trim() } : {}),
        ...(validUntil
          ? { validUntil: new Date(`${validUntil}T00:00:00.000Z`).toISOString() }
          : {}),
      });
      setOpen(false);
      setStudentId("");
      setPurpose("");
      setValidUntil("");
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to issue document");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = (row: StudentDocument) => {
    const reason = window.prompt("Reason for revoking this document");
    if (!reason?.trim()) return;
    setBusy(true);
    setError(null);
    revokeStudentDocument(row.id, reason.trim())
      .then(load)
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to revoke document"),
      )
      .finally(() => setBusy(false));
  };

  if (loading) return <LoadingState label="Loading certificates and ID cards" />;

  const totalCount = pageData.summary.total;
  const certificatesCount = pageData.summary.certificates;
  const idCardsCount = pageData.summary.idCards;
  const revokedCount = pageData.summary.revoked;

  const selectedStudentObj = students.find((s) => s.id === studentId);

  return (
    <section className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Top Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Certificates & Student ID Cards</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Issue numbered, institution-branded certificates and digital ID cards for{" "}
            {selectedCampus?.name ?? "Campus"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="h-9 px-4 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Issue Document
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

      {/* 4 KPI Summary Cards Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Issued
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <FileBadge className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 leading-none">{totalCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            Official student records issued
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Certificates
            </span>
            <div className="h-7 w-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Award className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 leading-none">
            {certificatesCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            Bonafide, Study & Transfer
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Student ID Cards
            </span>
            <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 leading-none">{idCardsCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            Active student ID cards
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[96px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Revoked / Inactive
            </span>
            <div className="h-7 w-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 leading-none">{revokedCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            Cancelled or replaced
          </div>
        </div>
      </div>

      {/* Modern Filter Sub-Tabs */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => {
            setSelectedTypeTab("ALL");
            setPage(1);
          }}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 transition-all ${
            selectedTypeTab === "ALL"
              ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          All Documents
        </button>
        {types.map(([type, title, Icon]) => {
          const isActive = selectedTypeTab === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSelectedTypeTab(type);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{title}</span>
            </button>
          );
        })}
      </nav>

      {/* Toolbar Filter Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            aria-label="Search documents"
            placeholder="Search student name, admission #, or document #"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <ModernSelect
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            className="w-[150px]"
            options={[
              { label: "All Statuses", value: "ALL" },
              { label: "Issued (Active)", value: "ISSUED" },
              { label: "Revoked", value: "REVOKED" },
            ]}
          />
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 whitespace-nowrap">
            {pageData.total} Document{pageData.total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Data Table Container */}
      {rows.length ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3">Document #</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Student</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">
                  Document Type
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Issue Date</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Status</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const typeObj = types.find(([t]) => t === row.documentType);
                const IconComponent = typeObj?.[2] ?? FileText;

                return (
                  <TableRow key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="py-3 font-mono text-xs font-bold text-blue-700">
                      {row.documentNumber}
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {row.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{row.studentName}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Adm: {row.admissionNumber}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <IconComponent className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {typeObj?.[1] ?? row.documentType}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-xs text-slate-600 font-medium">
                      {new Date(row.issuedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="py-3 text-xs">
                      <Badge variant={row.status === "ISSUED" ? "success" : "secondary"}>
                        {row.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={row.status !== "ISSUED"}
                          onClick={() =>
                            void downloadStudentDocument(row).catch((value) =>
                              setError(value instanceof Error ? value.message : "Download failed"),
                            )
                          }
                          className="h-8 px-2.5 text-xs font-semibold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> PDF
                        </Button>

                        {row.status === "ISSUED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Revoke Document"
                            aria-label={`Revoke document ${row.documentNumber}`}
                            onClick={() => handleRevoke(row)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ServerPagination
            page={page}
            pageSize={pageSize}
            total={pageData.total}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </div>
      ) : (
        <EmptyState
          title="No documents issued"
          description="Issue a certificate or student ID card for an enrolled student."
        />
      )}

      {/* Modal for Issuing Document */}
      <Modal
        open={open}
        title="Issue Student Document"
        description={`${selectedCampus?.name ?? "No Campus"} • ${selectedAcademicYear?.name ?? "No Academic Year"}`}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Select Student</Label>
            <Input
              aria-label="Search active students"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search by student name or admission number"
              className="mb-2 h-9 text-xs"
            />
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              <option value="">
                {loadingStudents ? "Searching active students..." : "Select active student"}
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} • Adm: {student.admissionNumber} •{" "}
                  {classes.find((item) => item.id === student.enrollment?.classId)?.name ??
                    "Class not assigned"}
                  {student.enrollment?.sectionId
                    ? ` · ${
                        sections.find((item) => item.id === student.enrollment?.sectionId)?.name ??
                        "Section not assigned"
                      }`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Document Type</Label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as StudentDocumentType)}
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              {types.map(([type, name]) => (
                <option key={type} value={type}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Purpose / Reference Note</Label>
            <Input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Passport Application / Bank Account Opening / State Transport Pass"
              className="h-9 text-xs"
            />
          </div>

          {documentType === "STUDENT_ID_CARD" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Valid Until Date</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* Live Document Preview Card */}
          {selectedStudentObj && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-blue-200/60 pb-2">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <FileBadge className="h-4 w-4 text-blue-600" />
                  {types.find(([t]) => t === documentType)?.[1]} Preview
                </span>
                <Badge variant="success">Auto-Generated</Badge>
              </div>

              <div className="text-[11px] space-y-1 text-slate-700">
                <p>
                  <strong>Student:</strong> {selectedStudentObj.name} (Adm:{" "}
                  {selectedStudentObj.admissionNumber})
                </p>
                <p>
                  <strong>Campus:</strong> {selectedCampus?.name ?? "—"}
                </p>
                <p>
                  <strong>Format:</strong> High-Resolution Official PDF with QR Verification Seal
                </p>
              </div>
            </div>
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
              type="button"
              size="sm"
              disabled={busy || !studentId}
              onClick={() => void issue()}
              className="h-9 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              <FileBadge className="h-4 w-4 mr-1.5" /> Issue Document
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
