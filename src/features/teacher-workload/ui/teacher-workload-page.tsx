import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Pencil,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../shared/ui/dialog";
import {
  getTeacherWorkloadWorkspace,
  saveTeacherAvailability,
  saveTeacherWorkloadOverride,
} from "../api/teacher-workload.api";
import type {
  SaveAvailabilityInput,
  TeacherWorkloadWorkspace,
  WorkloadViewMode,
} from "../model/teacher-workload.types";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateOnly = (value?: string) => value?.slice(0, 10) ?? "";
const isoDate = (value: string) => value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
const currentMonday = () => {
  const value = new Date();
  const day = value.getDay();
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1));
  return value.toISOString().slice(0, 10);
};
const clock = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hour, minute));
};
const lessonTone: Record<string, string> = {
  THEORY: "border-blue-200 bg-blue-50 text-blue-950",
  LECTURE: "border-blue-200 bg-blue-50 text-blue-950",
  PRACTICAL: "border-emerald-200 bg-emerald-50 text-emerald-950",
  LAB: "border-emerald-200 bg-emerald-50 text-emerald-950",
  TUTORIAL: "border-violet-200 bg-violet-50 text-violet-950",
  ACTIVITY: "border-amber-200 bg-amber-50 text-amber-950",
};

interface AvailabilityForm {
  id?: string;
  campusId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: "BLOCKED" | "PREFERRED";
  effectiveFrom: string;
  effectiveUntil: string;
  reason: string;
}

const emptyAvailability = (startDate?: string): AvailabilityForm => ({
  campusId: "", dayOfWeek: "MONDAY", startTime: "08:00", endTime: "09:00", type: "BLOCKED",
  effectiveFrom: dateOnly(startDate) || new Date().toISOString().slice(0, 10), effectiveUntil: "", reason: "",
});

export function TeacherWorkloadPage() {
  const { teacherId = "" } = useParams();
  const { academicYears, selectedAcademicYear, selectAcademicYear, loading: yearsLoading } = useSelectedAcademicYear();
  const [workspace, setWorkspace] = useState<TeacherWorkloadWorkspace | null>(null);
  const [viewMode, setViewMode] = useState<WorkloadViewMode>("PUBLISHED");
  const [scheduleView, setScheduleView] = useState<"TABLE" | "LIST">("TABLE");
  const [weekStartDate, setWeekStartDate] = useState(currentMonday);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityForm>(emptyAvailability());
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({ weekly: "30", daily: "7", consecutive: "3", effectiveFrom: "", effectiveUntil: "", reason: "" });

  const load = useCallback(async () => {
    if (!teacherId || !selectedAcademicYear) return;
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await getTeacherWorkloadWorkspace({
        teacherId,
        academicYearId: selectedAcademicYear.id,
        viewMode,
        weekStartDate: new Date(`${weekStartDate}T00:00:00.000Z`).toISOString(),
      }));
    } catch (value) {
      setWorkspace(null);
      setError(value instanceof Error ? value.message : "Unable to load teacher workload");
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, teacherId, viewMode, weekStartDate]);

  useEffect(() => { void load(); }, [load]);

  const timeRows = useMemo(() => {
    if (!workspace) return [];
    return [...new Map(workspace.timetableEntries.map((entry) => [`${entry.startTime}|${entry.endTime}`, { startTime: entry.startTime, endTime: entry.endTime }])).values()]
      .sort((left, right) => left.startTime.localeCompare(right.startTime) || left.endTime.localeCompare(right.endTime));
  }, [workspace]);

  if (yearsLoading || (loading && !workspace)) return <LoadingState label="Loading workload and timetable" />;
  if (error && !workspace) return <ErrorState message={error} retry={() => void load()} />;
  if (!workspace || !selectedAcademicYear) return <ErrorState message="Select an academic year to view teacher workload." />;

  const multipleCampuses = workspace.campusBreakdown.length > 1;
  const editAvailability = (entry?: TeacherWorkloadWorkspace["availabilityExceptions"][number]) => {
    setAvailability(entry ? { id:entry.id,campusId:entry.campusId ?? "",dayOfWeek:entry.dayOfWeek,startTime:entry.startTime,endTime:entry.endTime,type:entry.type,effectiveFrom:dateOnly(entry.effectiveFrom),effectiveUntil:dateOnly(entry.effectiveUntil),reason:entry.reason ?? "" } : emptyAvailability(workspace.academicYear.startDate));
    setAvailabilityOpen(true);
  };
  const editPolicy = () => {
    setPolicyForm({ weekly:String(workspace.policy.maximumWeeklyPeriods),daily:String(workspace.policy.maximumDailyPeriods),consecutive:String(workspace.policy.maximumConsecutivePeriods),effectiveFrom:dateOnly(workspace.policy.effectiveFrom) || dateOnly(workspace.academicYear.startDate),effectiveUntil:dateOnly(workspace.policy.effectiveUntil),reason:workspace.policy.reason ?? "" });
    setPolicyOpen(true);
  };
  const saveAvailability = async () => {
    setBusy(true); setError(null);
    try {
      const input: SaveAvailabilityInput = { ...(availability.id ? { id:availability.id } : {}), employeeId:workspace.teacher.id, ...(availability.campusId ? { campusId:availability.campusId } : {}), academicYearId:workspace.academicYear.id,dayOfWeek:availability.dayOfWeek,startTime:availability.startTime,endTime:availability.endTime,availabilityType:availability.type,effectiveFrom:isoDate(availability.effectiveFrom)!,...(availability.effectiveUntil ? { effectiveUntil:isoDate(availability.effectiveUntil)! } : {}),...(availability.reason.trim() ? { reason:availability.reason.trim() } : {}) };
      await saveTeacherAvailability(input); setAvailabilityOpen(false); await load();
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to save availability"); }
    finally { setBusy(false); }
  };
  const savePolicy = async () => {
    const weekly=Number(policyForm.weekly),daily=Number(policyForm.daily),consecutive=Number(policyForm.consecutive);
    if (![weekly,daily,consecutive].every((value)=>Number.isFinite(value)&&value>0) || !policyForm.effectiveFrom || !policyForm.reason.trim()) { setError("Positive workload limits, effective from and an override reason are required."); return; }
    setBusy(true); setError(null);
    try {
      await saveTeacherWorkloadOverride({scopeType:"EMPLOYEE",employeeId:workspace.teacher.id,maximumContactPeriodsPerWeek:weekly,maximumPeriodsPerDay:daily,maximumConsecutivePeriods:consecutive,effectiveFrom:isoDate(policyForm.effectiveFrom)!,...(policyForm.effectiveUntil?{effectiveUntil:isoDate(policyForm.effectiveUntil)!}:{}),reason:policyForm.reason.trim(),componentMultipliers:[]});
      setPolicyOpen(false); await load();
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to save workload override"); }
    finally { setBusy(false); }
  };
  const download = () => {
    const rows = [["Day","Start","End","Class","Section or Batch","Subject","Component","Campus","State"], ...workspace.timetableEntries.map((entry)=>[label(entry.dayOfWeek),entry.startTime,entry.endTime,entry.className??entry.programName??"",entry.sectionName??entry.subjectBatchName??"",entry.subjectName,label(entry.componentType),entry.campusName,label(entry.state)])];
    const csv=rows.map((row)=>row.map((cell)=>`"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
    const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));link.download=`${workspace.teacher.employeeCode}-workload-${workspace.weekStartDate.slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
  };

  return (
    <section className="space-y-5 pb-12 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><Link to="/admin/staff" className="hover:text-blue-700">Staff Directory</Link><span>/</span><Link to={`/admin/staff/${workspace.teacher.id}`} className="hover:text-blue-700">{workspace.teacher.fullName}</Link><span>/</span><span className="text-slate-800">Workload</span></div>
          <h1 className="text-2xl font-bold">Workload & Timetable</h1>
          <p className="mt-1 text-sm text-slate-500">Consolidated teaching assignments, actual schedule, availability and active workload issues.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild><Link to={`/admin/staff/${workspace.teacher.id}`}><ArrowLeft className="mr-1.5 h-4 w-4"/>Profile</Link></Button>
          <Button variant="outline" size="sm" onClick={download}><Download className="mr-1.5 h-4 w-4"/>Download</Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      <div className="grid gap-4 border-y border-slate-200 bg-white py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-blue-600 text-xl font-bold text-white">{workspace.teacher.fullName.charAt(0)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold">{workspace.teacher.fullName}</h2><Badge variant="secondary">{workspace.teacher.employeeCode}</Badge>{viewMode === "LATEST_DRAFT" && workspace.selectedVersions.some((item)=>item.status==="DRAFT") && <Badge variant="warning">Draft preview</Badge>}</div>
            <p className="mt-1 text-sm text-slate-600">{workspace.teacher.designation || label(workspace.teacher.staffType)}{workspace.teacher.department ? ` · ${workspace.teacher.department}` : ""}</p>
            <p className="mt-1 text-xs text-slate-500">Primary campus: {workspace.campusBreakdown.find((item)=>item.campusId===workspace.teacher.primaryCampusId)?.campusName ?? workspace.campusBreakdown[0]?.campusName ?? "Not assigned"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <label className="text-xs font-semibold text-slate-600">Academic year<select value={selectedAcademicYear.id} onChange={(event)=>selectAcademicYear(event.target.value)} className="mt-1 block h-9 min-w-40 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">{academicYears.map((year)=><option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Week starting<input type="date" value={weekStartDate} onChange={(event)=>setWeekStartDate(event.target.value)} className="mt-1 block h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"/></label>
        </div>
      </div>

      <div className="grid grid-cols-2 border border-slate-200 bg-white sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Required periods",workspace.summary.requiredPeriods,"text-slate-950"],
          ["Scheduled periods",workspace.summary.scheduledPeriods,"text-blue-700"],
          ["Unscheduled periods",workspace.summary.unscheduledPeriods,workspace.summary.unscheduledPeriods?"text-amber-700":"text-emerald-700"],
          ["Maximum workload",workspace.summary.maximumWeeklyPeriods,"text-slate-950"],
          ["Remaining capacity",workspace.summary.remainingCapacity,"text-emerald-700"],
          ["Substitutions this week",workspace.summary.substitutionPeriods,"text-violet-700"],
        ].map(([name,value,tone],index)=><div key={String(name)} className={`min-w-0 p-4 ${index%2?"border-l":""} border-b border-slate-200 sm:border-l sm:[&:nth-last-child(-n+3)]:border-b-0 xl:border-b-0`}><p className="text-xs font-semibold text-slate-500">{name}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p></div>)}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-bold">Consolidated weekly timetable</h2><p className="mt-0.5 text-xs text-slate-500">All assigned classes and campuses. Times come from the selected timetable versions.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold"><button type="button" onClick={()=>setViewMode("PUBLISHED")} className={`rounded px-3 py-1.5 ${viewMode==="PUBLISHED"?"bg-white text-blue-700 shadow-sm":"text-slate-600"}`}>Published</button><button type="button" onClick={()=>setViewMode("LATEST_DRAFT")} className={`rounded px-3 py-1.5 ${viewMode==="LATEST_DRAFT"?"bg-white text-blue-700 shadow-sm":"text-slate-600"}`}>Latest draft</button></div>
            <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold"><button type="button" onClick={()=>setScheduleView("TABLE")} className={`rounded px-3 py-1.5 ${scheduleView==="TABLE"?"bg-white text-blue-700 shadow-sm":"text-slate-600"}`}>Table view</button><button type="button" onClick={()=>setScheduleView("LIST")} className={`rounded px-3 py-1.5 ${scheduleView==="LIST"?"bg-white text-blue-700 shadow-sm":"text-slate-600"}`}>List view</button></div>
          </div>
        </div>
        {workspace.timetableEntries.length===0 ? <div className="border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"><CalendarDays className="mx-auto h-6 w-6 text-slate-400"/><p className="mt-2 text-sm font-semibold text-slate-700">{viewMode === "LATEST_DRAFT" ? "No lessons in the latest draft for this teacher" : "No published lessons for this teacher"}</p><p className="mt-1 text-xs text-slate-500">Assignments can exist before the timetable is fully scheduled.</p></div> : scheduleView==="TABLE" ? (
          <div className="overflow-x-auto border border-slate-200 bg-white"><table className="min-w-[1050px] w-full border-collapse text-xs"><thead><tr className="bg-slate-50 text-slate-600"><th className="w-32 border-b border-r border-slate-200 px-3 py-3 text-left font-semibold">Time</th>{DAYS.map((item)=><th key={item} className="border-b border-r border-slate-200 px-2 py-3 text-center font-semibold last:border-r-0">{label(item)}</th>)}</tr></thead><tbody>{timeRows.map((row)=><tr key={`${row.startTime}-${row.endTime}`}><th className="border-b border-r border-slate-200 px-3 py-3 text-left align-top font-semibold text-slate-600"><span className="block">{clock(row.startTime)}</span><span className="block text-[11px] font-normal text-slate-400">{clock(row.endTime)}</span></th>{DAYS.map((dayOfWeek)=>{const entries=workspace.timetableEntries.filter((entry)=>entry.dayOfWeek===dayOfWeek&&entry.startTime===row.startTime&&entry.endTime===row.endTime);return <td key={dayOfWeek} className="h-24 border-b border-r border-slate-200 p-1.5 align-top last:border-r-0">{entries.length?entries.map((entry)=><div key={entry.id} className={`mb-1 rounded border p-2 leading-tight last:mb-0 ${entry.state==="CANCELLED"?"border-slate-300 bg-slate-100 text-slate-500 line-through":lessonTone[entry.componentType]??"border-slate-200 bg-slate-50 text-slate-900"}`}><div className="font-bold">{entry.subjectName}</div><div className="mt-1 font-semibold">{[entry.className||entry.programName,entry.sectionName||entry.subjectBatchName].filter(Boolean).join(" · ")}</div><div className="mt-1 text-[10px] opacity-75">{label(entry.componentType)}{entry.periodCount>1?` · ${entry.periodCount} periods`:""}</div>{multipleCampuses&&<div className="mt-1 text-[10px] font-semibold">{entry.campusName}</div>}{entry.state!=="PERMANENT"&&<span className="mt-1 inline-block rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase">{label(entry.state)}</span>}</div>):<span className="block py-7 text-center text-[11px] text-slate-300">Free</span>}</td>})}</tr>)}</tbody></table></div>
        ) : <div className="divide-y divide-slate-200 border border-slate-200 bg-white">{DAYS.map((dayOfWeek)=>{const entries=workspace.timetableEntries.filter((entry)=>entry.dayOfWeek===dayOfWeek);return <div key={dayOfWeek} className="grid gap-3 p-4 md:grid-cols-[110px_1fr]"><h3 className="text-sm font-bold text-slate-800">{label(dayOfWeek)}</h3><div className="space-y-2">{entries.length?entries.map((entry)=><div key={entry.id} className="grid gap-2 rounded-md border border-slate-200 px-3 py-2 sm:grid-cols-[130px_1fr_auto]"><span className="font-semibold text-slate-600">{clock(entry.startTime)} - {clock(entry.endTime)}</span><span><strong>{entry.subjectName}</strong> · {[entry.className||entry.programName,entry.sectionName||entry.subjectBatchName].filter(Boolean).join(" / ")}</span><Badge variant={entry.state==="CANCELLED"?"secondary":entry.state==="SUBSTITUTION"?"warning":"success"}>{label(entry.state)}</Badge></div>):<p className="text-xs text-slate-400">No classes scheduled.</p>}</div></div>})}</div>}
      </div>

      <div className="space-y-3"><div><h2 className="text-base font-bold">Assigned classes and subjects</h2><p className="mt-0.5 text-xs text-slate-500">Required periods come from Class Setup. Corrections open the exact class and section context.</p></div><div className="overflow-x-auto border border-slate-200 bg-white"><table className="min-w-[900px] w-full text-xs"><thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600"><th className="px-3 py-3">Class / Section</th><th className="px-3 py-3">Subject</th><th className="px-3 py-3">Component</th><th className="px-3 py-3 text-right">Required</th><th className="px-3 py-3 text-right">Scheduled</th><th className="px-3 py-3 text-right">Gap</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody>{workspace.assignments.map((item)=><tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-3 font-semibold">{[item.className||item.programName,item.sectionName||item.subjectBatchName].filter(Boolean).join(" / ")||"Unmapped assignment"}<span className="mt-0.5 block font-normal text-slate-500">{item.campusName}</span></td><td className="px-3 py-3 font-semibold">{item.subjectName}</td><td className="px-3 py-3">{label(item.componentType)}</td><td className="px-3 py-3 text-right">{item.requiredPeriods}</td><td className="px-3 py-3 text-right">{item.scheduledPeriods}</td><td className="px-3 py-3 text-right font-semibold">{item.unscheduledPeriods}</td><td className="px-3 py-3"><Badge variant={item.status==="COMPLETE"?"success":"warning"}>{label(item.status)}</Badge></td><td className="px-3 py-3 text-right">{item.classSetupPath&&<Button variant="ghost" size="sm" asChild><Link to={item.classSetupPath}>Open in Class Setup<ExternalLink className="ml-1.5 h-3.5 w-3.5"/></Link></Button>}</td></tr>)}</tbody></table></div></div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 className="flex items-center gap-2 text-sm font-bold"><Clock3 className="h-4 w-4 text-blue-600"/>Availability exceptions</h2><p className="mt-0.5 text-xs text-slate-500">All teaching periods are available unless listed here.</p></div><Button size="sm" variant="outline" onClick={()=>editAvailability()}><Plus className="mr-1.5 h-4 w-4"/>Add</Button></div><div className="divide-y divide-slate-100">{workspace.availabilityExceptions.length?workspace.availabilityExceptions.map((item)=><div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs"><div><div className="flex items-center gap-2"><span className="font-bold">{label(item.dayOfWeek)} · {clock(item.startTime)} - {clock(item.endTime)}</span><Badge variant={item.type==="BLOCKED"?"destructive":"brand"}>{label(item.type)}</Badge></div><p className="mt-1 text-slate-500">{item.campusId?workspace.campusBreakdown.find((campus)=>campus.campusId===item.campusId)?.campusName:"All permitted campuses"}{item.reason?` · ${item.reason}`:""}</p></div><button type="button" onClick={()=>editAvailability(item)} aria-label="Edit availability exception" className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-700"><Pencil className="h-4 w-4"/></button></div>):<p className="px-4 py-8 text-center text-xs text-slate-500">No blocked or preferred periods configured.</p>}</div></div>
        <div className="border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 className="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal className="h-4 w-4 text-blue-600"/>Workload limits</h2><p className="mt-0.5 text-xs text-slate-500">Inherited defaults with an optional time-bound teacher override.</p></div><Button size="sm" variant="outline" onClick={editPolicy}><Pencil className="mr-1.5 h-4 w-4"/>Override</Button></div><dl className="grid grid-cols-3 divide-x divide-slate-200 py-4 text-center"><div><dt className="text-xs text-slate-500">Weekly</dt><dd className="mt-1 text-xl font-bold">{workspace.policy.maximumWeeklyPeriods}</dd></div><div><dt className="text-xs text-slate-500">Daily</dt><dd className="mt-1 text-xl font-bold">{workspace.policy.maximumDailyPeriods}</dd></div><div><dt className="text-xs text-slate-500">Consecutive</dt><dd className="mt-1 text-xl font-bold">{workspace.policy.maximumConsecutivePeriods}</dd></div></dl><div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600"><span className="font-semibold">Source:</span> {label(workspace.policy.inheritedFrom)}{workspace.policy.isOverride&&<Badge variant="warning" className="ml-2">Teacher override</Badge>}{workspace.policy.reason&&<p className="mt-1 text-slate-500">{workspace.policy.reason}</p>}</div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <div className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-bold"><ShieldAlert className="h-4 w-4 text-amber-600"/>Active workload and timetable issues</h2></div>{workspace.issues.length?<div className="divide-y divide-slate-100">{workspace.issues.map((issue,index)=><div key={`${issue.code}-${index}`} className="flex gap-3 px-4 py-3"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${issue.severity==="ERROR"?"bg-rose-50 text-rose-600":"bg-amber-50 text-amber-600"}`}><AlertTriangle className="h-4 w-4"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{issue.reason}</p><Badge variant={issue.severity==="ERROR"?"destructive":"warning"}>{label(issue.severity)}</Badge></div>{(issue.dayOfWeek||issue.startTime||issue.classSection||issue.subjectName)&&<p className="mt-1 text-xs text-slate-500">{[issue.dayOfWeek&&label(issue.dayOfWeek),issue.startTime&&`${clock(issue.startTime)}${issue.endTime?` - ${clock(issue.endTime)}`:""}`,issue.classSection,issue.subjectName].filter(Boolean).join(" · ")}</p>}{issue.conflictingAssignment&&<p className="mt-1 text-xs font-medium text-rose-700">Conflicts with: {issue.conflictingAssignment}</p>}{issue.actionPath&&<Link to={issue.actionPath} className="mt-2 inline-flex items-center text-xs font-bold text-blue-700 hover:underline">{issue.recommendedAction}<ExternalLink className="ml-1 h-3 w-3"/></Link>}</div></div>)}</div>:<div className="px-4 py-10 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600"/><p className="mt-2 text-sm font-bold text-emerald-800">No active workload issues</p></div>}</div>
        <div className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-bold"><UserCheck className="h-4 w-4 text-blue-600"/>Academic responsibilities</h2><p className="mt-0.5 text-xs text-slate-500">Shown separately and not counted as teaching periods.</p></div><div className="divide-y divide-slate-100">{workspace.responsibilities.length?workspace.responsibilities.map((item)=><div key={item.id} className="px-4 py-3 text-xs"><p className="font-bold">{label(item.responsibilityType)}</p><p className="mt-1 text-slate-600">{[item.className,item.sectionName].filter(Boolean).join(" / ")||"Institution responsibility"}</p><p className="mt-1 text-slate-500">{item.campusName}</p></div>):<p className="px-4 py-8 text-center text-xs text-slate-500">No Class Teacher or Section Incharge responsibility assigned.</p>}</div></div>
      </div>

      <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{availability.id?"Edit":"Add"} availability exception</DialogTitle></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Day<select value={availability.dayOfWeek} onChange={(event)=>setAvailability({...availability,dayOfWeek:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{DAYS.map((item)=><option key={item} value={item}>{label(item)}</option>)}</select></label><label className="text-xs font-semibold text-slate-700">Type<select value={availability.type} onChange={(event)=>setAvailability({...availability,type:event.target.value as AvailabilityForm["type"]})} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="BLOCKED">Blocked</option><option value="PREFERRED">Preferred</option></select></label><label className="text-xs font-semibold text-slate-700">Start time<input type="time" value={availability.startTime} onChange={(event)=>setAvailability({...availability,startTime:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">End time<input type="time" value={availability.endTime} onChange={(event)=>setAvailability({...availability,endTime:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">Campus<select value={availability.campusId} onChange={(event)=>setAvailability({...availability,campusId:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">All permitted campuses</option>{workspace.campusBreakdown.map((item)=><option key={item.campusId} value={item.campusId}>{item.campusName}</option>)}</select></label><span/><label className="text-xs font-semibold text-slate-700">Effective from<input type="date" value={availability.effectiveFrom} onChange={(event)=>setAvailability({...availability,effectiveFrom:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700">Effective until<input type="date" value={availability.effectiveUntil} onChange={(event)=>setAvailability({...availability,effectiveUntil:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700 sm:col-span-2">Reason<textarea value={availability.reason} onChange={(event)=>setAvailability({...availability,reason:event.target.value})} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"/></label></div><DialogFooter><Button variant="outline" onClick={()=>setAvailabilityOpen(false)}>Cancel</Button><Button disabled={busy||!availability.effectiveFrom||!availability.startTime||!availability.endTime} onClick={()=>void saveAvailability()}>Save exception</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Teacher workload override</DialogTitle></DialogHeader><p className="text-xs text-slate-500">Use an override only when this teacher cannot follow the inherited workload policy. The reason and effective period are mandatory.</p><div className="grid gap-4 py-2 sm:grid-cols-3">{([['Maximum weekly periods','weekly'],['Maximum daily periods','daily'],['Maximum consecutive periods','consecutive']] as const).map(([title,key])=><label key={key} className="text-xs font-semibold text-slate-700">{title}<input type="text" inputMode="numeric" value={policyForm[key]} onChange={(event)=>setPolicyForm({...policyForm,[key]:event.target.value.replace(/\D/g,"")})} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"/></label>)}<label className="text-xs font-semibold text-slate-700 sm:col-span-1">Effective from<input type="date" value={policyForm.effectiveFrom} onChange={(event)=>setPolicyForm({...policyForm,effectiveFrom:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700 sm:col-span-2">Effective until<input type="date" value={policyForm.effectiveUntil} onChange={(event)=>setPolicyForm({...policyForm,effectiveUntil:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-semibold text-slate-700 sm:col-span-3">Reason<textarea value={policyForm.reason} onChange={(event)=>setPolicyForm({...policyForm,reason:event.target.value})} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"/></label></div><DialogFooter><Button variant="outline" onClick={()=>setPolicyOpen(false)}>Cancel</Button><Button disabled={busy} onClick={()=>void savePolicy()}>Apply override</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}
