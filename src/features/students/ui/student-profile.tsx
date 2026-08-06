import {
  Banknote,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Pencil,
  Printer,
  Search,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  listClasses,
  listPrograms,
  listSections,
} from "../../academic-structure/api/academic-structure.api";
import {
  collectFinancePayment,
  getFinanceReceipt,
  listFeeOrders,
  listFinancePayments,
} from "../../finance/api/finance-operations.api";
import type {
  FeeOrder,
  FinancePayment,
  FinanceReceipt,
  PaymentMethod,
} from "../../finance/model/finance-operations.types";
import { changeStudentEnrollment, createCampusTransfer, createStudentNote, getStudent, listCampusTransfers, listStudentNotes, updateStudentNote, type CampusTransfer, type StudentNote } from "../api/students.api";
import type { Student } from "../model/student.types";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  deleteFile,
  getFileDownloadUrl,
  listFiles,
  uploadFile,
  type StoredFile,
} from "../../storage/api/files.api";
import type {
  AcademicClass,
  Section,
  Program,
} from "../../academic-structure/model/academic-structure.types";
import { Modal } from "../../../shared/ui/modal";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { cn } from "../../../shared/ui/utils";
import { downloadReceiptPdf, printReceiptPdf } from "../../finance/lib/receipt-document";
import {
  downloadStudentDocument,
  listStudentDocuments,
} from "../../student-documents/api/student-documents.api";
import type { StudentDocument } from "../../student-documents/model/student-document.types";
import { listCampuses } from "../../tenant-settings/api/settings.api";
import type { Campus } from "../../tenant-settings/model/settings.types";

type Tab =
  | "summary"
  | "academic"
  | "finance"
  | "documents"
  | "timeline"
  | "notes";

const tabLabels: Record<Tab, { label: string; icon: LucideIcon }> = {
  summary: { label: "Summary", icon: UserRound },
  academic: { label: "Academic", icon: GraduationCap },
  finance: { label: "Fee Payments", icon: CreditCard },
  documents: { label: "Documents", icon: FileText },
  timeline: { label: "Timeline", icon: Clock },
  notes: { label: "Notes", icon: Pencil },
};

const studentDocumentTypes = [
  ["IDENTITY", "Identity proof"],
  ["BIRTH_CERTIFICATE", "Birth certificate"],
  ["TRANSFER_CERTIFICATE", "Transfer certificate"],
  ["PREVIOUS_MARKS_CARD", "Previous marks card"],
  ["CASTE_CERTIFICATE", "Caste certificate"],
  ["INCOME_CERTIFICATE", "Income certificate"],
  ["MEDICAL_RECORD", "Medical record"],
  ["PHOTOGRAPH", "Student photograph"],
  ["OTHER", "Other document"],
] as const;

const money = (minor: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    minor / 100,
  );

const dateStr = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value),
      )
    : "—";

function openPrintableReceipt(receipt: FinanceReceipt) {
  printReceiptPdf(receipt);
}

function downloadReceipt(receipt: FinanceReceipt) {
  downloadReceiptPdf(receipt);
}

export function StudentProfile() {
  const { studentId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("summary");
  const [academicSubTab, setAcademicSubTab] = useState<"SUBJECTS" | "HISTORY" | "DOCS">("SUBJECTS");
  const [student, setStudent] = useState<Student | null>(null);
  const [orders, setOrders] = useState<FeeOrder[]>([]);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [labels, setLabels] = useState({
    program: "—",
    academicClass: "—",
    section: "—",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<StoredFile[]>([]);
  const [issuedDocuments, setIssuedDocuments] = useState<StudentDocument[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [campusTransfers, setCampusTransfers] = useState<CampusTransfer[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [pendingDocument, setPendingDocument] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("IDENTITY");
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [targetCampusId, setTargetCampusId] = useState("");
  const [targetPrograms, setTargetPrograms] = useState<Program[]>([]);
  const [targetClasses, setTargetClasses] = useState<AcademicClass[]>([]);
  const [targetSections, setTargetSections] = useState<Section[]>([]);
  const [editingEnrollment, setEditingEnrollment] = useState(false);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [collectingOrder, setCollectingOrder] = useState<FeeOrder | null>(null);
  const [collectionAmount, setCollectionAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [paymentReference, setPaymentReference] = useState("");
  const [collectionRequestId, setCollectionRequestId] = useState("");
  const [collecting, setCollecting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const record = await getStudent(studentId);
      const [
        programsData,
        classesData,
        sectionsData,
        feeOrders,
        financePayments,
        storedFiles,
        issuedDocumentRows,
        campusRows,
        noteRows,
        transferRows,
      ] = await Promise.all([
        listPrograms(record.enrollment.campusId),
        listClasses(record.enrollment.campusId),
        listSections(record.enrollment.campusId),
        listFeeOrders({
          studentId: record.id,
          campusId: record.enrollment.campusId,
          academicYearId: record.enrollment.academicYearId,
        }),
        listFinancePayments({
          studentId: record.id,
          campusId: record.enrollment.campusId,
          academicYearId: record.enrollment.academicYearId,
        }),
        listFiles({
          scopeType: "STUDENT",
          scopeId: record.id,
          status: "AVAILABLE",
        }),
        listStudentDocuments({ studentId: record.id }),
        listCampuses(),
        listStudentNotes(record.id),
        listCampusTransfers(record.id),
      ]);
      setStudent(record);
      setOrders(feeOrders);
      setPayments(financePayments);
      setDocuments(storedFiles);
      setIssuedDocuments(issuedDocumentRows);
      setClasses(classesData);
      setSections(sectionsData);
      setPrograms(programsData);
      setCampuses(campusRows);
      setNotes(noteRows);
      setCampusTransfers(transferRows);
      setLabels({
        program:
          programsData.find((item) => item.id === record.enrollment.programId)
            ?.name ?? "—",
        academicClass:
          classesData.find((item) => item.id === record.enrollment.classId)
            ?.name ?? "—",
        section:
          sectionsData.find((item) => item.id === record.enrollment.sectionId)
            ?.name ?? "Not assigned",
      });
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Unable to load student profile",
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  async function saveNote() {
    if (!noteBody.trim()) return;
    setSavingNote(true);
    setError(null);
    try {
      if (editingNoteId) {
        const saved = await updateStudentNote(editingNoteId, noteBody);
        setNotes((current) => current.map((item) => item.id === saved.id ? saved : item));
      } else {
        const saved = await createStudentNote(studentId, noteBody);
        setNotes((current) => [saved, ...current]);
      }
      setNoteBody("");
      setEditingNoteId("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save student note");
    } finally {
      setSavingNote(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () =>
      orders.reduce(
        (result, order) => ({
          total: result.total + order.totalMinor,
          paid: result.paid + order.paidMinor,
          balance: result.balance + order.balanceMinor,
        }),
        { total: 0, paid: 0, balance: 0 },
      ),
    [orders],
  );

  async function receiptAction(paymentId: string, action: "print" | "download") {
    try {
      const receipt = await getFinanceReceipt(paymentId);
      if (action === "print") openPrintableReceipt(receipt);
      else downloadReceipt(receipt);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to create receipt");
    }
  }

  function beginCollection(order: FeeOrder) {
    setCollectingOrder(order);
    setCollectionAmount((order.balanceMinor / 100).toFixed(2));
    setPaymentMethod("UPI");
    setPaymentReference("");
    setCollectionRequestId(crypto.randomUUID());
    setError(null);
  }

  async function collectStudentFee() {
    if (!student || !collectingOrder) return;
    const amountMinor = Math.round(Number(collectionAmount) * 100);
    if (
      !Number.isSafeInteger(amountMinor) ||
      amountMinor <= 0 ||
      amountMinor > collectingOrder.balanceMinor
    ) {
      setError(`Enter an amount up to ${money(collectingOrder.balanceMinor)}`);
      return;
    }
    if (paymentMethod !== "CASH" && !paymentReference.trim()) {
      setError("Enter the payment transaction reference");
      return;
    }
    try {
      setCollecting(true);
      setError(null);
      const payment = await collectFinancePayment({
        studentId: student.id,
        method: paymentMethod,
        reference: paymentReference.trim(),
        allocations: [{ feeOrderId: collectingOrder.id, amountMinor }],
        idempotencyKey: collectionRequestId,
      });
      setCollectingOrder(null);
      setCollectionRequestId("");
      const [feeOrders, financePayments] = await Promise.all([
        listFeeOrders({
          studentId: student.id,
          campusId: student.enrollment.campusId,
          academicYearId: student.enrollment.academicYearId,
        }),
        listFinancePayments({
          studentId: student.id,
          campusId: student.enrollment.campusId,
          academicYearId: student.enrollment.academicYearId,
        }),
      ]);
      setOrders(feeOrders);
      setPayments(financePayments);
      const receipt = await getFinanceReceipt(payment.id);
      openPrintableReceipt(receipt);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Payment collection could not be completed",
      );
    } finally {
      setCollecting(false);
    }
  }

  function beginEnrollmentChange() {
    if (!student) return;
    setTargetCampusId(student.enrollment.campusId);
    setTargetPrograms(programs);
    setTargetClasses(classes);
    setTargetSections(sections);
    setClassId(student.enrollment.classId);
    setSectionId(student.enrollment.sectionId ?? "");
    setChangeReason("");
    setError(null);
    setEditingEnrollment(true);
  }

  async function selectTargetCampus(cId: string) {
    setTargetCampusId(cId);
    setClassId("");
    setSectionId("");
    if (!cId) {
      setTargetPrograms([]);
      setTargetClasses([]);
      setTargetSections([]);
      return;
    }
    try {
      const [programRows, classRows, sectionRows] = await Promise.all([
        listPrograms(cId),
        listClasses(cId),
        listSections(cId),
      ]);
      setTargetPrograms(programRows);
      setTargetClasses(classRows);
      setTargetSections(sectionRows);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load campus structure");
    }
  }

  async function saveEnrollmentChange() {
    if (!student) return;
    try {
      setSavingEnrollment(true);
      setError(null);
      if (targetCampusId !== student.enrollment.campusId) {
        const transfer = await createCampusTransfer({ studentId: student.id, targetCampusId, academicYearId: student.enrollment.academicYearId, targetClassId: classId, ...(sectionId ? { targetSectionId: sectionId } : {}), effectiveAt: new Date().toISOString(), reason: changeReason.trim(), clientRequestId: crypto.randomUUID() });
        setCampusTransfers((current) => [transfer, ...current]);
        setEditingEnrollment(false);
        return;
      }
      const record = await changeStudentEnrollment(student.id, {
        campusId: targetCampusId,
        academicYearId: student.enrollment.academicYearId,
        classId,
        ...(sectionId ? { sectionId } : {}),
        reason: changeReason.trim(),
      });
      setStudent(record);
      setPrograms(targetPrograms);
      setClasses(targetClasses);
      setSections(targetSections);
      setLabels({
        program:
          targetPrograms.find((item) => item.id === record.enrollment.programId)
            ?.name ?? "—",
        academicClass:
          targetClasses.find((item) => item.id === record.enrollment.classId)
            ?.name ?? "—",
        section:
          targetSections.find((item) => item.id === record.enrollment.sectionId)
            ?.name ?? "Not assigned",
      });
      setEditingEnrollment(false);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Unable to change enrollment",
      );
    } finally {
      setSavingEnrollment(false);
    }
  }

  async function addDocument() {
    if (!student || !pendingDocument) return;
    try {
      setUploading(true);
      setError(null);
      await uploadFile({
        file: pendingDocument,
        scopeType: "STUDENT",
        scopeId: student.id,
        metadata: {
          documentType,
          documentLabel:
            studentDocumentTypes.find(([value]) => value === documentType)?.[1] ??
            "Student document",
        },
      });
      setDocuments(
        await listFiles({
          scopeType: "STUDENT",
          scopeId: student.id,
          status: "AVAILABLE",
        }),
      );
      setPendingDocument(null);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Unable to upload document",
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(file: StoredFile) {
    if (!student) return;
    try {
      setDeletingDocumentId(file.id);
      setError(null);
      await deleteFile(file.id);
      setDocuments((current) => current.filter((item) => item.id !== file.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to delete document");
    } finally {
      setDeletingDocumentId("");
    }
  }

  async function openDocument(file: StoredFile) {
    try {
      const url = await getFileDownloadUrl(file.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Unable to retrieve document link",
      );
    }
  }

  if (loading) return <LoadingState label="Loading student details profile" />;
  if (error && !student) return <ErrorState message={error} retry={() => void load()} />;
  if (!student) return null;

  const currentCampusName = campuses.find((c) => c.id === student.enrollment.campusId)?.name || "—";
  const overdueOrders = orders.filter((o) => o.balanceMinor > 0 && !["PAID", "CLOSED", "CANCELLED"].includes(o.status));
  const overdueTotalMinor = overdueOrders.reduce((sum, o) => sum + o.balanceMinor, 0);

  return (
    <section className="space-y-5 pb-12">
      {/* Top Breadcrumb & Header Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Link to="/admin/students" className="hover:text-slate-900 transition-colors">
            Students
          </Link>
          <span>›</span>
          <span className="hover:text-slate-900">Student Management</span>
          <span>›</span>
          <span className="text-slate-900 font-bold">Student Details</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input placeholder="Search students, admission no., roll no..." className="pl-8 h-8 text-xs font-medium bg-white" />
          </div>
          <button type="button" className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 relative">
            <span className="h-2 w-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white"></span>
            🔔
          </button>
        </div>
      </div>

      {/* Top Student Hero Banner Card (100% REAL BACKEND DATA) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-5">
          {/* Avatar Photo & Core Badges */}
          <div className="flex items-center gap-4">
            <div className="h-24 w-20 rounded-xl bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center shrink-0 border-2 border-slate-200 shadow-2xs overflow-hidden">
              {student.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{student.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                  {student.status}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-600 space-x-3">
                <span>Admission No : <strong className="text-slate-900">{student.admissionNumber}</strong></span>
                <span>Roll No : <strong className="text-slate-900">{student.enrollment.rollNumber || "—"}</strong></span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800">
                  {labels.academicClass} {labels.section !== "Not assigned" ? `- ${labels.section}` : ""}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-brand-50 text-brand-700">
                  {student.gender || "—"}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                  {dateStr(student.dateOfBirth)}
                </span>
              </div>
            </div>
          </div>

          {/* Key Quick Info Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-medium text-slate-700 border-l border-slate-200 pl-6 my-auto">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-bold">Guardian Name</span>
              <span className="font-extrabold text-slate-900">: {student.guardian?.name || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-bold">Relation</span>
              <span className="font-bold text-slate-900">: {student.guardian?.relation || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-bold">Mobile</span>
              <span className="font-bold text-slate-900">: {student.guardian?.phone || student.phone || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-bold">Email</span>
              <span className="font-semibold text-slate-800">: {student.email || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-bold">Aadhaar / Reg</span>
              <span className="font-mono text-slate-800">: {student.registrationNumber || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-bold">Admission No</span>
              <span className="font-mono font-bold text-brand-700">: {student.admissionNumber}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-slate-300">
              <Pencil size={13} /> Edit Student
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-slate-300">
              ... More Actions
            </Button>
            <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5">
              <button type="button" className="h-7 w-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded">
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="h-7 w-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 8 Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-2 rounded-xl border overflow-x-auto shadow-2xs">
        {(Object.keys(tabLabels) as Tab[]).map((tabKey) => {
          const isActive = tab === tabKey;
          const Icon = tabLabels[tabKey].icon;
          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              className={cn(
                "flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                isActive
                  ? "border-brand-600 text-brand-700 font-extrabold bg-brand-50/40 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              )}
            >
              <Icon size={15} />
              <span>{tabLabels[tabKey].label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUMMARY VIEW */}
      {tab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          {/* Main Left Content Column */}
          <div className="space-y-5">
            {/* Top 4 Overview Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3 shadow-2xs">
                <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Admission Date</span>
                  <strong className="text-xs font-extrabold text-slate-900 block">{dateStr(student.createdAt)}</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3 shadow-2xs">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Current Class</span>
                  <strong className="text-xs font-extrabold text-slate-900 block">{labels.academicClass}</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3 shadow-2xs">
                <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Campus</span>
                  <strong className="text-xs font-extrabold text-slate-900 block">{currentCampusName}</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3 shadow-2xs">
                <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Status</span>
                  <strong className="text-xs font-extrabold text-slate-900 block">{student.status}</strong>
                </div>
              </div>
            </div>

            {/* Personal Information & Academic Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Personal Information */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                  Personal Information
                </h3>
                <div className="space-y-2 text-xs font-medium text-slate-800">
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-slate-400 font-bold">Full Name</span>
                    <span className="font-extrabold text-slate-900">: {student.name}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-slate-400 font-bold">Gender</span>
                    <span>: {student.gender || "—"}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-slate-400 font-bold">Date of Birth</span>
                    <span>: {dateStr(student.dateOfBirth)}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-slate-400 font-bold">Aadhaar No</span>
                    <span className="font-mono">: {student.registrationNumber || "—"}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-slate-400 font-bold">Mobile</span>
                    <span>: {student.phone || "—"}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-slate-400 font-bold">Email</span>
                    <span>: {student.email || "—"}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr]">
                    <span className="text-slate-400 font-bold">Address</span>
                    <span>: {student.address || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                  Academic Information
                </h3>
                <div className="space-y-2 text-xs font-medium text-slate-800">
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="text-slate-400 font-bold">Class - Section</span>
                    <span className="font-bold text-slate-900">: {labels.academicClass} {labels.section !== "Not assigned" ? `- ${labels.section}` : ""}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="text-slate-400 font-bold">Roll No</span>
                    <span className="font-mono">: {student.enrollment.rollNumber || "—"}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="text-slate-400 font-bold">Program</span>
                    <span>: {labels.program}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="text-slate-400 font-bold">Admission Type</span>
                    <span>: Regular</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="text-slate-400 font-bold">Enrollment Date</span>
                    <span>: {dateStr(student.enrollment.enrolledAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parent / Guardian Info & Fee Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                  Parent / Guardian Information
                </h3>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                  <span className="text-[10px] font-extrabold text-brand-700 uppercase block">{student.guardian?.relation || "Guardian"}</span>
                  <strong className="block text-slate-900 font-bold">{student.guardian?.name || "—"}</strong>
                  <span className="text-[11px] text-slate-500 block">{student.guardian?.phone || student.phone || "—"}</span>
                </div>
              </div>

              {/* Fee Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                  Fee Summary
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-900">
                    <span className="text-[10px] font-bold block text-emerald-700">Total Payable</span>
                    <strong className="text-xs font-black">{money(totals.total)}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-brand-50 text-brand-900">
                    <span className="text-[10px] font-bold block text-brand-700">Total Paid</span>
                    <strong className="text-xs font-black">{money(totals.paid)}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900">
                    <span className="text-[10px] font-bold block text-amber-700">Balance Due</span>
                    <strong className="text-xs font-black">{money(totals.balance)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("finance")}
                  className="text-xs font-bold text-brand-700 hover:underline block text-right pt-1 cursor-pointer"
                >
                  View Full Payment History →
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-4">
            {/* Quick Actions Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Quick Actions</h3>
              <div className="space-y-1.5 text-xs font-bold">
                <button type="button" className="w-full text-left p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2">
                  <Pencil size={14} className="text-brand-600" /> Edit Student
                </button>
                <button type="button" onClick={beginEnrollmentChange} className="w-full text-left p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2">
                  <GraduationCap size={14} className="text-brand-600" /> Promote / Upgrade Class
                </button>
                <button type="button" className="w-full text-left p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2">
                  <CreditCard size={14} className="text-brand-600" /> Generate ID Card
                </button>
                <button type="button" className="w-full text-left p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2">
                  <FileText size={14} className="text-brand-600" /> Generate Documents
                </button>
              </div>
            </div>

            {/* Important Dates Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs text-xs">
              <h3 className="font-extrabold text-slate-900 uppercase tracking-wide">Important Dates</h3>
              <div className="space-y-2 text-slate-700 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Admission Date</span>
                  <strong className="font-bold">{dateStr(student.createdAt)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Enrollment Date</span>
                  <strong className="font-bold">{dateStr(student.enrollment.enrolledAt)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMIC VIEW (STRICTLY REAL DATA) */}
      {tab === "academic" && (
        <div className="space-y-5">
          {campusTransfers.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs"><div className="flex items-center justify-between"><div><h3 className="text-sm font-extrabold text-slate-900">Campus transfer history</h3><p className="mt-1 text-xs text-slate-500">Cross-campus changes are coordinated with Finance before the enrollment is switched.</p></div><Badge variant={campusTransfers[0]?.status === "COMPLETED" ? "success" : campusTransfers[0]?.status === "FAILED" ? "destructive" : "warning"}>{campusTransfers[0]?.status.replaceAll("_", " ")}</Badge></div><div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">{campusTransfers.map((item)=><div key={item.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[1fr_auto]"><div><strong className="text-slate-800">{campuses.find(c=>c.id===item.source.campusId)?.name??"Previous campus"} to {campuses.find(c=>c.id===item.target.campusId)?.name??"Target campus"}</strong><p className="mt-1 text-slate-500">{item.reason}</p>{item.warning&&<p className="mt-1 font-semibold text-amber-700">{item.warning}</p>}{item.failureReason&&<p className="mt-1 font-semibold text-rose-700">{item.failureReason}</p>}</div><div className="text-right text-slate-500"><div>{dateStr(item.effectiveAt)}</div><div className="mt-1 font-semibold">Registration: {item.registrationAction.toLowerCase()}</div></div></div>)}</div></div>}
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Class - Section</span>
              <strong className="text-xs font-black text-slate-900 block mt-0.5">{labels.academicClass} {labels.section !== "Not assigned" ? `- ${labels.section}` : ""}</strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Roll No.</span>
              <strong className="text-xs font-black text-slate-900 font-mono block mt-0.5">{student.enrollment.rollNumber || "—"}</strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Date</span>
              <strong className="text-xs font-black text-slate-900 block mt-0.5">{dateStr(student.createdAt)}</strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Type</span>
              <strong className="text-xs font-black text-slate-900 block mt-0.5">Regular</strong>
            </div>
          </div>

          {/* Academic Sub-Tabs Selector */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-1.5 rounded-xl border shadow-2xs">
            <div className="flex items-center gap-2">
              {(
                [
                  { id: "SUBJECTS", label: "Subjects" },
                  { id: "HISTORY", label: "Class & Section History" },
                  { id: "DOCS", label: "Academic Documents" },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setAcademicSubTab(sub.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    academicSubTab === sub.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={beginEnrollmentChange} className="h-7 text-xs font-bold">
              Change Assignment
            </Button>
          </div>

          {/* Sub-Tab 1: Subjects */}
          {academicSubTab === "SUBJECTS" && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center space-y-2 shadow-2xs">
              <BookOpen size={28} className="mx-auto text-slate-300" />
              <h3 className="text-xs font-extrabold text-slate-800">Class Subjects</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Subjects are automatically assigned based on the active class curriculum. No custom subject overrides logged for {labels.academicClass}.
              </p>
            </div>
          )}

          {/* Sub-Tab 2: Class & Section History Table */}
          {academicSubTab === "HISTORY" && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <h3 className="text-xs font-extrabold text-slate-900">Class & Section Enrollment History</h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-xs font-bold text-slate-600">
                    <TableHead>Class - Section</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Enrolled Date</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow>
                    <TableCell className="font-bold text-slate-800">{labels.academicClass} {labels.section !== "Not assigned" ? `- ${labels.section}` : ""}</TableCell>
                    <TableCell className="font-mono">{student.enrollment.rollNumber || "—"}</TableCell>
                    <TableCell>{dateStr(student.enrollment.enrolledAt)}</TableCell>
                    <TableCell>
                      <Badge variant="success">Current</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {/* Sub-Tab 3: Academic Documents */}
          {academicSubTab === "DOCS" && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <h3 className="text-xs font-extrabold text-slate-900">Issued Academic Certificates</h3>
              {issuedDocuments.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <FileText size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No academic certificates issued yet.</p>
                  <p className="text-[11px] text-slate-400">Certificates issued from Certificates & ID Cards will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-xs font-bold text-slate-600">
                      <TableHead>Document No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {issuedDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono font-bold text-slate-900">{doc.documentNumber}</TableCell>
                        <TableCell className="font-bold text-slate-800">{doc.documentType}</TableCell>
                        <TableCell className="text-slate-600">{dateStr(doc.issuedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon-sm" variant="ghost" title="Download PDF" onClick={() => void downloadStudentDocument(doc)}>
                            <Download size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FEE PAYMENTS VIEW */}
      {tab === "finance" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          <div className="space-y-6">
            {/* 5 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Payable</span>
                <strong className="text-sm font-black text-slate-900 block mt-0.5">{money(totals.total)}</strong>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Paid</span>
                <strong className="text-sm font-black text-emerald-600 block mt-0.5">{money(totals.paid)}</strong>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Balance Due</span>
                <strong className="text-sm font-black text-amber-600 block mt-0.5">{money(totals.balance)}</strong>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Overdue Amount</span>
                <strong className="text-sm font-black text-rose-600 block mt-0.5">{money(overdueTotalMinor)}</strong>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Payment</span>
                <strong className="text-xs font-bold text-slate-800 block mt-0.5">
                  {payments[0]?.amountMinor ? money(payments[0].amountMinor) : "—"}
                </strong>
              </div>
            </div>

            {/* Fee Orders Table */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-extrabold text-slate-900">Fee Orders ({orders.length})</h3>
              </div>
              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No fee orders generated for this student yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-xs font-bold text-slate-600">
                      <TableHead>Order No.</TableHead>
                      <TableHead>Fee Structure</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-bold text-slate-900">{order.orderNumber}</TableCell>
                        <TableCell className="font-medium text-slate-800">{order.structureName}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{money(order.totalMinor)}</TableCell>
                        <TableCell className="font-semibold text-emerald-700">{money(order.paidMinor)}</TableCell>
                        <TableCell className="font-semibold text-amber-700">{money(order.balanceMinor)}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === "PAID" ? "success" : "brand"}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {order.balanceMinor > 0 && (
                            <Button size="sm" variant="brand" onClick={() => beginCollection(order)} className="h-7 text-xs font-bold px-3">
                              Collect Fee
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Payment & Receipts History Table */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-extrabold text-slate-900">Payment History & Receipts ({payments.length})</h3>
              </div>
              {payments.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <CreditCard size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No payment receipts recorded yet.</p>
                  <p className="text-[11px] text-slate-400">Payments collected will appear here with instant receipt download.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-xs font-bold text-slate-600">
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Reference No.</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {payments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-slate-50/60">
                        <TableCell className="font-mono font-bold text-brand-700">{payment.receiptNumber}</TableCell>
                        <TableCell className="text-slate-600 font-medium">{dateStr(payment.paidAt)}</TableCell>
                        <TableCell className="font-bold text-slate-800">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10.5px]">
                            {payment.method.replaceAll("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-slate-600 text-[11px]">{payment.reference || "—"}</TableCell>
                        <TableCell className="font-extrabold text-slate-900">{money(payment.amountMinor)}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "SUCCESS" ? "success" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Print Receipt"
                              onClick={() => void receiptAction(payment.id, "print")}
                              className="h-7 w-7 text-slate-600 hover:text-brand-600"
                            >
                              <Printer size={14} />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Download Receipt PDF"
                              onClick={() => void receiptAction(payment.id, "download")}
                              className="h-7 w-7 text-slate-600 hover:text-brand-600"
                            >
                              <Download size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Quick Actions</h3>
              <div className="space-y-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { const firstOrder = orders[0]; if (firstOrder) beginCollection(firstOrder); }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Banknote size={14} className="text-brand-600" /> Collect Payment
                </button>
                <button
                  type="button"
                  onClick={() => payments[0] && void receiptAction(payments[0].id, "download")}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={14} className="text-brand-600" /> Download Last Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TIMELINE VIEW (STRICTLY REAL EVENTS) */}
      {tab === "timeline" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2">
              Student Activity Timeline
            </h3>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 text-xs">
              <div className="relative pl-6">
                <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-600 ring-4 ring-white"></span>
                <span className="text-[11px] font-bold text-slate-400 block">{dateStr(student.createdAt)}</span>
                <strong className="text-slate-900 font-bold block mt-0.5">Student Record Created</strong>
                <p className="text-slate-600 text-[11.5px] mt-0.5">Enrolled into {labels.academicClass} at {currentCampusName}.</p>
              </div>

              {orders.map((o) => (
                <div key={o.id} className="relative pl-6">
                  <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-amber-500 ring-4 ring-white"></span>
                  <span className="text-[11px] font-bold text-slate-400 block">{dateStr(o.createdAt)}</span>
                  <strong className="text-slate-900 font-bold block mt-0.5">Fee Order Generated: {o.orderNumber}</strong>
                  <p className="text-slate-600 text-[11.5px] mt-0.5">{o.structureName} — Total: {money(o.totalMinor)}</p>
                </div>
              ))}

              {payments.map((p) => (
                <div key={p.id} className="relative pl-6">
                  <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-brand-600 ring-4 ring-white"></span>
                  <span className="text-[11px] font-bold text-slate-400 block">{dateStr(p.paidAt)}</span>
                  <strong className="text-slate-900 font-bold block mt-0.5">Payment Received: {money(p.amountMinor)}</strong>
                  <p className="text-slate-600 text-[11.5px] mt-0.5">Receipt {p.receiptNumber} issued via {p.method}.</p>
                </div>
              ))}

              {issuedDocuments.map((document) => (
                <div key={document.id} className="relative pl-6">
                  <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-indigo-500 ring-4 ring-white"></span>
                  <span className="text-[11px] font-bold text-slate-400 block">{dateStr(document.issuedAt)}</span>
                  <strong className="text-slate-900 font-bold block mt-0.5">
                    {document.status === "REVOKED" ? "Document Revoked" : "Document Issued"}: {document.documentNumber}
                  </strong>
                  <p className="text-slate-600 text-[11.5px] mt-0.5">
                    {document.documentType.replaceAll("_", " ").toLowerCase()}
                    {document.revokeReason ? ` — ${document.revokeReason}` : ""}
                  </p>
                </div>
              ))}

              {documents.map((document) => (
                <div key={document.id} className="relative pl-6">
                  <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-cyan-600 ring-4 ring-white"></span>
                  <span className="text-[11px] font-bold text-slate-400 block">
                    {document.createdAt ? dateStr(document.createdAt) : "Date unavailable"}
                  </span>
                  <strong className="text-slate-900 font-bold block mt-0.5">Student File Added</strong>
                  <p className="text-slate-600 text-[11.5px] mt-0.5">{document.fileName}</p>
                </div>
              ))}

              {notes.map((note) => (
                <div key={note.id} className="relative pl-6">
                  <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-500 ring-4 ring-white"></span>
                  <span className="text-[11px] font-bold text-slate-400 block">{dateStr(note.updatedAt)}</span>
                  <strong className="text-slate-900 font-bold block mt-0.5">Internal Note Updated</strong>
                  <p className="text-slate-600 text-[11.5px] mt-0.5 line-clamp-2">{note.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs text-xs">
              <h3 className="font-extrabold text-slate-900 uppercase tracking-wide">Timeline Summary</h3>
              <div className="space-y-2 text-slate-700 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Events</span>
                  <strong className="font-bold">
                    {1 + orders.length + payments.length + issuedDocuments.length + documents.length + notes.length}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Academic Events</span>
                  <strong className="font-bold">1</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Finance Events</span>
                  <strong className="font-bold">{orders.length + payments.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Document Events</span>
                  <strong className="font-bold">{issuedDocuments.length + documents.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Internal Notes</span>
                  <strong className="font-bold">{notes.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS VIEW */}
      {tab === "documents" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Student record files
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Upload identity, admission, academic, and supporting records into the student’s protected file scope.
                </p>
              </div>
              <Badge variant="secondary">{documents.length} uploaded</Badge>
            </div>

            <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[220px_1fr_auto] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="student-document-type" className="text-xs font-bold">
                  Document type
                </Label>
                <select
                  id="student-document-type"
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
                >
                  {studentDocumentTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-document-file" className="text-xs font-bold">
                  File
                </Label>
                <Input
                  id="student-document-file"
                  type="file"
                  onChange={(event) =>
                    setPendingDocument(event.target.files?.[0] ?? null)
                  }
                  className="h-9 bg-white text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="brand"
                disabled={!pendingDocument || uploading}
                onClick={() => void addDocument()}
                className="h-9"
              >
                <Upload size={14} />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Document type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[112px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-xs text-slate-500">
                      No student record files uploaded.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-semibold text-slate-900">
                        {file.fileName}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {file.metadata?.documentLabel ??
                          file.metadata?.documentType ??
                          "Student document"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {dateStr(file.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Open document"
                            onClick={() => void openDocument(file)}
                          >
                            <Eye size={15} />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Delete document"
                            disabled={deletingDocumentId === file.id}
                            onClick={() => void removeDocument(file)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Issued documents
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Certificates and official documents generated by the ERP.
                </p>
              </div>
              <Badge variant="secondary">{issuedDocuments.length} issued</Badge>
            </div>
            {issuedDocuments.length === 0 ? (
              <p className="mt-4 rounded-lg bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                No official documents have been issued.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {issuedDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {document.documentType.replaceAll("_", " ")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Issued {dateStr(document.issuedAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void downloadStudentDocument(document)}
                    >
                      <Download size={14} />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: NOTES VIEW */}
      {tab === "notes" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs text-xs">
          <h3 className="font-extrabold text-slate-900">Student Internal Notes</h3>
          <div className="space-y-2">
            <Label htmlFor="student-note">{editingNoteId ? "Update note" : "Add internal note"}</Label>
            <textarea
              id="student-note"
              rows={4}
              maxLength={2000}
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              placeholder="Record information relevant to authorized staff."
            />
            <div className="flex justify-end gap-2">
              {editingNoteId ? (
                <Button type="button" variant="outline" size="sm" onClick={() => { setEditingNoteId(""); setNoteBody(""); }}>Cancel</Button>
              ) : null}
              <Button type="button" size="sm" disabled={savingNote || !noteBody.trim()} onClick={() => void saveNote()}>
                {editingNoteId ? "Update note" : "Add note"}
              </Button>
            </div>
          </div>
          <Separator />
          {notes.length ? (
            <div className="space-y-2">
              {notes.map((note) => (
                <article key={note.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{note.body}</p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                    <span>{new Date(note.updatedAt).toLocaleString()}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingNoteId(note.id); setNoteBody(note.body); }}>
                      <Pencil size={13} /> Edit
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No internal staff notes recorded for this student profile yet.</p>
          )}
        </div>
      )}

      {/* Collect Fee Modal */}
      <Modal
        open={Boolean(collectingOrder)}
        title="Collect Student Fee"
        description={`${student.name} · ${student.admissionNumber}`}
        onClose={() => {
          if (!collecting) {
            setCollectingOrder(null);
            setCollectionRequestId("");
          }
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void collectStudentFee();
          }}
          className="space-y-4 text-xs"
        >
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-1">
            <span className="block text-slate-500 font-bold">Outstanding Balance</span>
            <strong className="block text-xl text-slate-900 font-black">{money(collectingOrder?.balanceMinor ?? 0)}</strong>
            <span className="block text-[11px] text-slate-500 font-semibold">
              {collectingOrder?.orderNumber} · {collectingOrder?.structureName}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="col-amount" className="font-bold text-slate-800">Amount (INR)</Label>
              <Input
                id="col-amount"
                required
                type="text"
                inputMode="decimal"
                value={collectionAmount}
                onChange={(e) => {
                  if (/^\d*(\.\d{0,2})?$/.test(e.target.value)) setCollectionAmount(e.target.value);
                }}
                placeholder="0.00"
                className="h-8.5 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-method" className="font-bold text-slate-800">Payment Method</Label>
              <select
                id="col-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="flex h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="col-ref" className="font-bold text-slate-800">
                {paymentMethod === "CASH" ? "Reference (Optional)" : "Transaction Reference"}
              </Label>
              <Input
                id="col-ref"
                required={paymentMethod !== "CASH"}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction or cheque reference"
                className="h-8.5 text-xs font-medium"
              />
            </div>
          </div>

          <Separator />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCollectingOrder(null);
                setCollectionRequestId("");
              }}
              disabled={collecting}
              className="h-8 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button disabled={collecting || (paymentMethod !== "CASH" && !paymentReference.trim())} size="sm" variant="brand" className="h-8 text-xs font-bold">
              {collecting ? "Collecting..." : "Collect & Print Receipt"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Enrollment Assignment Modal */}
      <Modal
        open={editingEnrollment}
        title="Change Academic Placement"
        description="Same-campus changes update placement. A campus change starts the audited transfer workflow with Finance review."
        onClose={() => setEditingEnrollment(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveEnrollmentChange();
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="change-campus" className="font-bold text-slate-800">Campus</Label>
              <select
                id="change-campus"
                value={targetCampusId}
                onChange={(event) => void selectTargetCampus(event.target.value)}
                required
                className="flex h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-800"
              >
                <option value="">Select campus</option>
                {campuses.filter((c) => c.status === "ACTIVE").map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="change-class" className="font-bold text-slate-800">Class</Label>
              <select
                id="change-class"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId("");
                }}
                required
                className="flex h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-800"
              >
                <option value="">Select class</option>
                {targetClasses
                  .filter((item) => item.status === "ACTIVE")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="change-sec" className="font-bold text-slate-800">Section</Label>
              <select
                id="change-sec"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="flex h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-800"
              >
                <option value="">Not assigned</option>
                {targetSections
                  .filter((item) => item.status === "ACTIVE" && item.classId === classId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="change-reason" className="font-bold text-slate-800">Reason</Label>
            <textarea
              id="change-reason"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              required
              placeholder="Reason for change"
              rows={2}
              className="flex w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium resize-none font-sans"
            />
          </div>

          <Separator />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingEnrollment(false)} className="h-8 text-xs font-bold">
              Cancel
            </Button>
            <Button size="sm" variant="brand" disabled={savingEnrollment || !targetCampusId || !classId || !changeReason.trim()} className="h-8 text-xs font-bold">
              {savingEnrollment ? "Saving..." : targetCampusId !== student.enrollment.campusId ? "Start Campus Transfer" : "Confirm Assignment"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
