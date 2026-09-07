import { CheckCircle2, Download, FileUp, MessageSquareReply } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  closeTeacherAcademicDoubt,
  listTeacherAcademicDoubts,
  replyTeacherAcademicDoubt,
} from "../api/teacher-engagement.api";
import type { AcademicDoubt, AcademicDoubtStatus } from "../model/teacher-engagement.types";
import { getFileDownloadUrl, uploadFile } from "../../storage/api/files.api";
import {
  ContentFilters,
  ContentPagination,
  Field,
} from "../../teacher-content/ui/teacher-content-primitives";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import {
  WorkspacePageHeader,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";

export function TeacherDoubtsPage() {
  const { workspace, workspaceLoading, workspaceError, operatingContext } = useTeacherWorkspace();
  const assignments = useMemo(
    () =>
      workspace?.assignments.filter(
        (item) => !operatingContext.campusId || item.campusId === operatingContext.campusId,
      ) ?? [],
    [operatingContext.campusId, workspace],
  );
  const [items, setItems] = useState<AcademicDoubt[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"ALL" | AcademicDoubtStatus>("OPEN");
  const [offering, setOffering] = useState("");
  const [selected, setSelected] = useState<AcademicDoubt | null>(null);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!workspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listTeacherAcademicDoubts({
        academicYearId: workspace.academicYear.id,
        ...(offering ? { subjectOfferingId: offering } : {}),
        ...(status !== "ALL" ? { status } : {}),
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load academic doubts");
    } finally {
      setLoading(false);
    }
  }, [offering, page, status, workspace]);
  useEffect(() => {
    void load();
  }, [load]);
  function openThread(item: AcademicDoubt) {
    setSelected(item);
    setMessage("");
    setFiles([]);
  }
  async function openFile(id: string) {
    try {
      window.open(await getFileDownloadUrl(id), "_blank", "noopener,noreferrer");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to open attachment");
    }
  }
  async function reply(event: FormEvent) {
    event.preventDefault();
    if (!selected || !workspace) return;
    setBusy(true);
    setError(null);
    try {
      const fileIds: string[] = [];
      for (const file of files) {
        const stored = await uploadFile({
          file,
          scopeType: selected.sectionId ? "SECTION" : "ACADEMIC_YEAR",
          scopeId: selected.sectionId ?? workspace.academicYear.id,
          metadata: {
            purpose: "ACADEMIC_DOUBT_REPLY",
            doubtId: selected.id,
            subjectOfferingId: selected.subjectOfferingId,
          },
        });
        fileIds.push(stored.id);
      }
      const updated = await replyTeacherAcademicDoubt({
        id: selected.id,
        expectedVersion: selected.version,
        message: message.trim(),
        fileIds,
      });
      setSelected(updated);
      setMessage("");
      setFiles([]);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to reply to academic doubt");
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await closeTeacherAcademicDoubt({ id: selected.id, expectedVersion: selected.version });
      setSelected(null);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to close academic doubt");
    } finally {
      setBusy(false);
    }
  }
  if (workspaceLoading && !workspace) return <LoadingState label="Loading academic doubts" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Academic Doubts"
        description="Answer student questions within your assigned subjects and preserve the complete discussion history."
      />
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          {error}
        </div>
      ) : null}
      <WorkspaceSurface>
        <ContentFilters
          assignments={assignments}
          assignmentId={offering}
          status={status}
          statuses={[
            { value: "ALL", label: "All statuses" },
            { value: "OPEN", label: "Open" },
            { value: "ANSWERED", label: "Answered" },
            { value: "CLOSED", label: "Closed" },
          ]}
          onAssignment={(value) => {
            setOffering(value);
            setPage(1);
          }}
          onStatus={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
        />
        {loading ? (
          <LoadingState label="Loading academic doubts" />
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => openThread(item)}
                className="block w-full p-4 text-left hover:bg-slate-50 sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      item.status === "OPEN"
                        ? "warning"
                        : item.status === "ANSWERED"
                          ? "blue"
                          : "secondary"
                    }
                  >
                    {item.status}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500">{item.studentName}</span>
                </div>
                <h2 className="mt-2 text-base font-bold text-slate-950">{item.title}</h2>
                <p className="mt-1 text-xs font-semibold text-blue-700">
                  {[item.className, item.sectionName, item.subjectName].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {item.question}
                </p>
                <span className="mt-2 block text-xs font-semibold text-slate-500">
                  {item.replies.length} repl{item.replies.length === 1 ? "y" : "ies"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No academic doubts in this view"
            description={
              assignments.length
                ? "Student questions for assigned subjects will appear here."
                : "An active teaching assignment is required to receive academic doubts."
            }
          />
        )}
        <ContentPagination
          noun="doubt"
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      </WorkspaceSurface>
      <Modal
        open={Boolean(selected)}
        title={selected?.title ?? "Academic doubt"}
        {...(selected
          ? {
              description: [
                selected.studentName,
                selected.className,
                selected.sectionName,
                selected.subjectName,
              ]
                .filter(Boolean)
                .join(" · "),
            }
          : {})}
        className="sm:max-w-3xl"
        onClose={() => {
          if (!busy) setSelected(null);
        }}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <strong className="text-xs text-slate-500">Student question</strong>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {selected.question}
              </p>
              {selected.fileIds.length ? (
                <div className="mt-3 flex gap-1">
                  {selected.fileIds.map((id, index) => (
                    <Button key={id} size="sm" variant="outline" onClick={() => void openFile(id)}>
                      <Download />
                      Attachment {index + 1}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
            {selected.replies.map((reply) => (
              <div
                key={reply.id}
                className={`rounded-md border p-4 ${reply.authorType === "TEACHER" ? "ml-6 border-blue-100 bg-blue-50" : "mr-6 border-slate-200 bg-white"}`}
              >
                <strong className="text-xs text-slate-600">
                  {reply.authorType === "TEACHER" ? "Teacher reply" : "Student follow-up"}
                </strong>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {reply.message}
                </p>
                {reply.fileIds.length ? (
                  <div className="mt-3 flex gap-1">
                    {reply.fileIds.map((id, index) => (
                      <Button
                        key={id}
                        size="sm"
                        variant="outline"
                        onClick={() => void openFile(id)}
                      >
                        <Download />
                        File {index + 1}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {selected.status !== "CLOSED" ? (
              <form
                onSubmit={(event) => void reply(event)}
                className="space-y-3 border-t border-slate-200 pt-4"
              >
                <Field label="Reply" htmlFor="doubt-reply">
                  <textarea
                    id="doubt-reply"
                    required
                    rows={5}
                    maxLength={4000}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm leading-6"
                  />
                </Field>
                <Field label="Supporting files (optional)" htmlFor="doubt-files">
                  <label
                    htmlFor="doubt-files"
                    className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600"
                  >
                    <FileUp />
                    {files.length
                      ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
                      : "Choose files"}
                  </label>
                  <input
                    id="doubt-files"
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                  />
                </Field>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void close()}
                    disabled={busy}
                  >
                    <CheckCircle2 />
                    Close doubt
                  </Button>
                  <Button type="submit" disabled={busy}>
                    <MessageSquareReply />
                    {busy ? "Sending..." : "Send reply"}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
