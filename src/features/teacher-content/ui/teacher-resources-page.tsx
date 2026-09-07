import { Archive, Download, Edit3, ExternalLink, FileUp, Link2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  archiveTeacherResource,
  listTeacherResources,
  saveTeacherResource,
} from "../api/teacher-content.api";
import type { TeachingResource, TeachingResourceStatus } from "../model/teacher-content.types";
import { getFileDownloadUrl, uploadFile } from "../../storage/api/files.api";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import {
  WorkspacePageHeader,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";
import { assignmentLabel, textareaClass } from "../model/teacher-content.utils";
import { ContentFilters, ContentPagination, Field } from "./teacher-content-primitives";

interface ResourceForm {
  id?: string;
  expectedVersion?: number;
  subjectOfferingId: string;
  title: string;
  description: string;
  resourceType: "FILE" | "LINK";
  externalUrl: string;
  fileId?: string;
  fileName?: string;
  contentType?: string;
}
const emptyForm = (subjectOfferingId = ""): ResourceForm => ({
  subjectOfferingId,
  title: "",
  description: "",
  resourceType: "FILE",
  externalUrl: "",
});

export function TeacherResourcesPage() {
  const { workspace, workspaceLoading, workspaceError, operatingContext } = useTeacherWorkspace();
  const assignments = useMemo(
    () =>
      workspace?.assignments.filter(
        (item) => !operatingContext.campusId || item.campusId === operatingContext.campusId,
      ) ?? [],
    [operatingContext.campusId, workspace],
  );
  const [items, setItems] = useState<TeachingResource[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"ALL" | TeachingResourceStatus>("ACTIVE");
  const [subjectOfferingId, setSubjectOfferingId] = useState("");
  const [form, setForm] = useState<ResourceForm>(() => emptyForm());
  const [file, setFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspace) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listTeacherResources({
        academicYearId: workspace.academicYear.id,
        ...(subjectOfferingId ? { subjectOfferingId } : {}),
        ...(status !== "ALL" ? { status } : {}),
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load teaching resources");
    } finally {
      setLoading(false);
    }
  }, [page, status, subjectOfferingId, workspace]);
  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm(subjectOfferingId || assignments[0]?.subjectOfferingId));
    setFile(null);
    setDialogOpen(true);
  }
  function openEdit(item: TeachingResource) {
    setForm({
      id: item.id,
      expectedVersion: item.version,
      subjectOfferingId: item.subjectOfferingId,
      title: item.title,
      description: item.description ?? "",
      resourceType: item.resourceType,
      externalUrl: item.externalUrl ?? "",
      ...(item.fileId ? { fileId: item.fileId } : {}),
      ...(item.fileName ? { fileName: item.fileName } : {}),
      ...(item.contentType ? { contentType: item.contentType } : {}),
    });
    setFile(null);
    setDialogOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    setBusy(true);
    setError(null);
    try {
      let fileDetails: { fileId?: string; fileName?: string; contentType?: string } = form.fileId
        ? {
            fileId: form.fileId,
            ...(form.fileName ? { fileName: form.fileName } : {}),
            ...(form.contentType ? { contentType: form.contentType } : {}),
          }
        : {};
      if (form.resourceType === "FILE" && file) {
        const assignment = assignments.find(
          (item) => item.subjectOfferingId === form.subjectOfferingId,
        );
        if (!assignment) throw new Error("Select an active teaching assignment");
        const stored = await uploadFile({
          file,
          scopeType: assignment.sectionId ? "SECTION" : "ACADEMIC_YEAR",
          scopeId: assignment.sectionId ?? workspace.academicYear.id,
          metadata: {
            purpose: "TEACHING_RESOURCE",
            academicYearId: workspace.academicYear.id,
            subjectOfferingId: assignment.subjectOfferingId,
          },
        });
        fileDetails = {
          fileId: stored.id,
          fileName: stored.fileName,
          contentType: stored.contentType,
        };
      }
      if (form.resourceType === "FILE" && !fileDetails.fileId)
        throw new Error("Choose a file to upload");
      await saveTeacherResource({
        ...(form.id ? { id: form.id } : {}),
        ...(form.expectedVersion ? { expectedVersion: form.expectedVersion } : {}),
        academicYearId: workspace.academicYear.id,
        subjectOfferingId: form.subjectOfferingId,
        title: form.title.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        resourceType: form.resourceType,
        ...(form.resourceType === "FILE"
          ? {
              ...(fileDetails.fileId ? { fileId: fileDetails.fileId } : {}),
              ...(fileDetails.fileName ? { fileName: fileDetails.fileName } : {}),
              ...(fileDetails.contentType ? { contentType: fileDetails.contentType } : {}),
            }
          : { externalUrl: form.externalUrl.trim() }),
      });
      setDialogOpen(false);
      setForm(emptyForm());
      setFile(null);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save teaching resource");
    } finally {
      setBusy(false);
    }
  }

  async function openResource(item: TeachingResource) {
    setError(null);
    try {
      const url =
        item.resourceType === "FILE" && item.fileId
          ? await getFileDownloadUrl(item.fileId)
          : item.externalUrl;
      if (!url) throw new Error("The resource target is unavailable");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to open teaching resource");
    }
  }

  async function archive(item: TeachingResource) {
    setBusy(true);
    setError(null);
    try {
      await archiveTeacherResource({ id: item.id, expectedVersion: item.version });
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to archive teaching resource");
    } finally {
      setBusy(false);
    }
  }

  if (workspaceLoading && !workspace) return <LoadingState label="Loading teaching resources" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Teaching Resources"
        description="Store reusable subject material and share controlled file or web references within assigned academic groups."
        actions={
          <Button onClick={openCreate} disabled={!assignments.length}>
            <Plus />
            Add resource
          </Button>
        }
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
          assignmentId={subjectOfferingId}
          status={status}
          statuses={[
            { value: "ALL", label: "All statuses" },
            { value: "ACTIVE", label: "Active" },
            { value: "ARCHIVED", label: "Archived" },
          ]}
          onAssignment={(value) => {
            setSubjectOfferingId(value);
            setPage(1);
          }}
          onStatus={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
        />
        {loading ? (
          <LoadingState label="Loading teaching resources" />
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.status === "ACTIVE" ? "success" : "secondary"}>
                      {item.status}
                    </Badge>
                    <Badge variant="outline">{item.resourceType}</Badge>
                  </div>
                  <h2 className="mt-2 text-base font-bold text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    {[item.className, item.sectionName, item.subjectName]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  ) : null}
                  <p className="mt-2 truncate text-xs font-medium text-slate-500">
                    {item.fileName ?? item.externalUrl}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Open resource"
                    aria-label={`Open ${item.title}`}
                    onClick={() => void openResource(item)}
                  >
                    {item.resourceType === "FILE" ? <Download /> : <ExternalLink />}
                  </Button>
                  {item.status === "ACTIVE" ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Edit resource"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => openEdit(item)}
                    >
                      <Edit3 />
                    </Button>
                  ) : null}
                  {item.status === "ACTIVE" ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Archive resource"
                      aria-label={`Archive ${item.title}`}
                      disabled={busy}
                      onClick={() => void archive(item)}
                    >
                      <Archive />
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No teaching resources in this view"
            description={
              assignments.length
                ? "Add a file or secure web reference for an assigned subject."
                : "An active teaching assignment is required before a resource can be added."
            }
          />
        )}
        <ContentPagination
          noun="resource"
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      </WorkspaceSurface>
      <Modal
        open={dialogOpen}
        title={form.id ? "Edit teaching resource" : "Add teaching resource"}
        description="File uploads use the tenant document store; Academics retains the subject linkage."
        onClose={() => {
          if (!busy) setDialogOpen(false);
        }}
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <Field label="Assigned class and subject" htmlFor="resource-assignment">
            <select
              id="resource-assignment"
              required
              value={form.subjectOfferingId}
              disabled={Boolean(form.id)}
              onChange={(event) =>
                setForm((current) => ({ ...current, subjectOfferingId: event.target.value }))
              }
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Select an assignment</option>
              {assignments.map((item) => (
                <option key={item.id} value={item.subjectOfferingId}>
                  {assignmentLabel(item)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="resource-title">
              <Input
                id="resource-title"
                required
                maxLength={180}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </Field>
            <Field label="Resource type" htmlFor="resource-type">
              <select
                id="resource-type"
                value={form.resourceType}
                disabled={Boolean(form.id)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    resourceType: event.target.value as "FILE" | "LINK",
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="FILE">File upload</option>
                <option value="LINK">Web link</option>
              </select>
            </Field>
          </div>
          <Field label="Description" htmlFor="resource-description">
            <textarea
              id="resource-description"
              rows={3}
              maxLength={2000}
              className={textareaClass}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </Field>
          {form.resourceType === "FILE" ? (
            <Field label={form.fileId ? "Replace file (optional)" : "File"} htmlFor="resource-file">
              <label
                htmlFor="resource-file"
                className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-blue-400 hover:bg-blue-50"
              >
                <FileUp className="mb-2 text-slate-500" />
                <strong className="text-sm text-slate-800">
                  {file?.name ?? form.fileName ?? "Choose a file"}
                </strong>
                <span className="mt-1 text-xs text-slate-500">
                  Uploaded through a signed storage URL
                </span>
              </label>
              <input
                id="resource-file"
                type="file"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Field>
          ) : (
            <Field label="Web address" htmlFor="resource-url">
              <div className="relative">
                <Link2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="resource-url"
                  required
                  type="url"
                  className="pl-9"
                  value={form.externalUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, externalUrl: event.target.value }))
                  }
                  placeholder="https://"
                />
              </div>
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save resource"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
