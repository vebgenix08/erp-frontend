import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { getApplication } from "../api/applications.api";
import type { AdmissionApplication } from "../model/application.types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Separator } from "../../../shared/ui/separator";

const displayDate = (value?: string) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
const title = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ApplicationDetail() {
  const { applicationId = "" } = useParams();
  const [record, setRecord] = useState<AdmissionApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setError(null);
    getApplication(applicationId).then(setRecord).catch((value) => setError(value instanceof Error ? value.message : "Unable to load application"));
  }, [applicationId]);
  if (error) return <ErrorState message={error} />;
  if (!record) return <LoadingState label="Loading admission application" />;
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm"><Link to="/admin/admissions/applications"><ArrowLeft size={15}/>Applications</Link></Button>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{record.studentName}</h2>
          <p className="text-sm text-slate-500">{record.admissionNumber ?? record.applicationNumber ?? "Draft application"}</p>
        </div>
        <Badge variant={record.status === "CONFIRMED" ? "success" : "secondary"}>{title(record.status)}</Badge>
      </header>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-900">Applicant and parent details</h3><Separator className="my-4"/>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Student", record.studentName], ["Date of birth", record.dateOfBirth?.slice(0, 10) ?? "Not recorded"],
              ["Phone", record.phone], ["Email", record.email ?? "Not recorded"], ["Parent", record.parentName],
              ["Parent phone", record.parentPhone ?? "Not recorded"], ["Relationship", record.parentRelation ?? "Not recorded"],
              ["Address", record.address ?? "Not recorded"],
            ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>)}
          </dl>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-900">Documents</h3><Separator className="my-4"/>
          {record.documents.length ? record.documents.map((document) => <div key={document.fileId} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"><FileText size={17} className="text-slate-400"/><div><p className="text-sm font-semibold">{document.fileName}</p><p className="text-xs text-slate-400">{title(document.documentType)}</p></div></div>) : <p className="text-sm text-slate-500">No documents attached.</p>}
        </article>
      </div>
      <article className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Workflow history</h3><Separator className="my-4"/>
        <ol className="space-y-3">{record.stageHistory.map((entry, index) => <li key={`${entry.status}-${entry.at}-${index}`} className="grid gap-1 border-l-2 border-slate-200 pl-4 sm:grid-cols-[150px_1fr]"><div><Badge variant="secondary">{title(entry.status)}</Badge><p className="mt-1 text-xs text-slate-400">{displayDate(entry.at)}</p></div><p className="text-sm text-slate-600">{entry.remarks ?? "Workflow transition recorded"}</p></li>)}</ol>
      </article>
    </section>
  );
}
