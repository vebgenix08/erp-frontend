import { Download, FileCheck2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listTeacherCourseworkSubmissions,
  reviewTeacherCourseworkSubmission,
} from "../api/teacher-engagement.api";
import type {
  CourseworkSubmission,
  CourseworkSubmissionStatus,
} from "../model/teacher-engagement.types";
import { getFileDownloadUrl } from "../../storage/api/files.api";
import { formatDate } from "../../teacher-content/model/teacher-content.utils";
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

export function TeacherSubmissionsPage() {
  const { workspace, workspaceLoading, workspaceError, operatingContext } = useTeacherWorkspace();
  const assignments = useMemo(
    () =>
      workspace?.assignments.filter(
        (item) => !operatingContext.campusId || item.campusId === operatingContext.campusId,
      ) ?? [],
    [operatingContext.campusId, workspace],
  );
  const [items, setItems] = useState<CourseworkSubmission[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"ALL" | CourseworkSubmissionStatus>("SUBMITTED");
  const [offering, setOffering] = useState("");
  const [selected, setSelected] = useState<CourseworkSubmission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"REVIEWED" | "RETURNED">("REVIEWED");
  const [feedback, setFeedback] = useState("");
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
      const result = await listTeacherCourseworkSubmissions({
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
      setError(value instanceof Error ? value.message : "Unable to load submissions");
    } finally {
      setLoading(false);
    }
  }, [offering, page, status, workspace]);
  useEffect(() => {
    void load();
  }, [load]);
  function openReview(item: CourseworkSubmission) {
    setSelected(item);
    setReviewStatus(item.status === "RETURNED" ? "RETURNED" : "REVIEWED");
    setFeedback(item.feedback ?? "");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await reviewTeacherCourseworkSubmission({
        id: selected.id,
        expectedVersion: selected.version,
        status: reviewStatus,
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      });
      setSelected(null);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to review submission");
    } finally {
      setBusy(false);
    }
  }
  async function openFile(id: string) {
    try {
      window.open(await getFileDownloadUrl(id), "_blank", "noopener,noreferrer");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to open submission file");
    }
  }
  if (workspaceLoading && !workspace) return <LoadingState label="Loading submissions" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Submission Review"
        description="Review student coursework responses and return clear feedback without changing examination marks."
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
            { value: "SUBMITTED", label: "Awaiting review" },
            { value: "REVIEWED", label: "Reviewed" },
            { value: "RETURNED", label: "Returned" },
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
          <LoadingState label="Loading submissions" />
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-[10px] font-extrabold uppercase text-slate-500">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Academic scope</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Files</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <strong className="block text-sm">{item.studentName}</strong>
                      <span className="text-xs text-slate-500">
                        {item.rollNumber ?? "Roll number not assigned"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                      {[item.className, item.sectionName, item.subjectName]
                        .filter(Boolean)
                        .join(" · ")}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {formatDate(item.submittedAt.slice(0, 10))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {item.fileIds.map((id, index) => (
                          <Button
                            key={id}
                            size="icon-sm"
                            variant="ghost"
                            title={`Open attachment ${index + 1}`}
                            onClick={() => void openFile(id)}
                          >
                            <Download />
                          </Button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === "REVIEWED"
                            ? "success"
                            : item.status === "RETURNED"
                              ? "warning"
                              : "blue"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openReview(item)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No submissions in this view"
            description={
              assignments.length
                ? "Student submissions will appear here after published coursework is answered."
                : "An active teaching assignment is required to receive submissions."
            }
          />
        )}
        <ContentPagination
          noun="submission"
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      </WorkspaceSurface>
      <Modal
        open={Boolean(selected)}
        title="Review submission"
        {...(selected ? { description: `${selected.studentName} · ${selected.subjectName}` } : {})}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {selected?.responseText ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {selected.responseText}
            </div>
          ) : null}
          <Field label="Review decision" htmlFor="submission-decision">
            <select
              id="submission-decision"
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="REVIEWED">Reviewed</option>
              <option value="RETURNED">Return for revision</option>
            </select>
          </Field>
          <Field label="Feedback" htmlFor="submission-feedback">
            <textarea
              id="submission-feedback"
              rows={6}
              maxLength={3000}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm leading-6"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {reviewStatus === "RETURNED" ? <RotateCcw /> : <FileCheck2 />}
              {busy ? "Saving..." : "Save review"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
