import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Camera,
  GraduationCap,
  LoaderCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { updateEmployee } from "../../staff/api/staff.api";
import { deleteFile, getFileDownloadUrl, uploadFile } from "../../storage/api/files.api";
import { publishMemberProfilePhoto } from "../../session/model/use-member-profile-photo";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import {
  WorkspaceDetails,
  WorkspacePageHeader,
  WorkspaceSectionHeading,
  WorkspaceStatus,
  WorkspaceSurface,
} from "./teacher-workspace-primitives";

function readable(value: string | undefined, fallback = "Not recorded") {
  return value?.trim()
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : fallback;
}

function date(value: string | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function TeacherProfilePage() {
  const { operatingContext, accessLabel, workspace, workspaceLoading, workspaceError } =
    useTeacherWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<
    { tone: "success" | "error"; text: string } | undefined
  >();

  useEffect(() => {
    let cancelled = false;
    const fileId = workspace?.teacher.profilePhotoFileId;
    if (!fileId) {
      setPhotoUrl(undefined);
      setPhotoLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setPhotoLoading(true);
    void getFileDownloadUrl(fileId)
      .then((url) => {
        if (!cancelled) setPhotoUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPhotoUrl(undefined);
      })
      .finally(() => {
        if (!cancelled) setPhotoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace?.teacher.profilePhotoFileId]);

  async function changePhoto(file: File | undefined) {
    const teacher = workspace?.teacher;
    if (!file || !teacher) return;
    setPhotoMessage(undefined);
    if (!file.type.startsWith("image/")) {
      setPhotoMessage({ tone: "error", text: "Choose a JPG, PNG or other image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMessage({ tone: "error", text: "Profile photos must be 5 MB or smaller." });
      return;
    }

    setPhotoSaving(true);
    let uploadedFileId: string | undefined;
    try {
      const stored = await uploadFile({
        file,
        scopeType: "TENANT",
        metadata: { category: "staff_profile", employeeId: teacher.id },
      });
      uploadedFileId = stored.id;
      await updateEmployee(teacher.id, { profilePhotoFileId: stored.id });
      const signedPhotoUrl = await getFileDownloadUrl(stored.id);
      setPhotoUrl(signedPhotoUrl);
      publishMemberProfilePhoto(signedPhotoUrl);
      setPhotoMessage({ tone: "success", text: "Profile photo updated." });
    } catch (error) {
      if (uploadedFileId) await deleteFile(uploadedFileId).catch(() => undefined);
      setPhotoMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Profile photo could not be updated.",
      });
    } finally {
      setPhotoSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  if (workspaceLoading && !workspace) return <LoadingState label="Loading employee profile" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );
  const teacher = workspace.teacher;
  const initials = teacher.fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="My Profile"
        description="Employment identity, teaching assignments and academic responsibilities."
      />
      <WorkspaceSurface className="overflow-hidden">
        <div className="h-24 bg-[#0f172a]" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <div className="-mt-10 shrink-0">
            <span className="relative grid h-24 w-24 overflow-hidden rounded-lg border-4 border-white bg-blue-50 text-2xl font-extrabold text-blue-950 shadow-sm">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`${teacher.fullName} profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid place-items-center">{initials}</span>
              )}
              {photoLoading ? (
                <span className="absolute inset-0 grid place-items-center bg-white/75">
                  <LoaderCircle size={20} className="animate-spin" aria-label="Loading photo" />
                </span>
              ) : null}
            </span>
          </div>
          <div className="min-w-0 flex-1 sm:pb-1">
            <h2 className="text-xl font-extrabold text-slate-950">{teacher.fullName}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {teacher.email ?? operatingContext.userEmail} ·{" "}
              {readable(teacher.designation, accessLabel)}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <WorkspaceStatus tone={teacher.status === "ACTIVE" ? "success" : "warning"}>
              {readable(teacher.status, "Active")}
            </WorkspaceStatus>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Choose profile photo"
              onChange={(event) => void changePhoto(event.target.files?.[0])}
            />
            <button
              type="button"
              disabled={photoSaving}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-950 disabled:cursor-wait disabled:opacity-60"
            >
              {photoSaving ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              {photoSaving ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
            </button>
            {photoMessage ? (
              <p
                role={photoMessage.tone === "error" ? "alert" : "status"}
                className={`text-[11px] font-semibold ${
                  photoMessage.tone === "error" ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {photoMessage.text}
              </p>
            ) : null}
          </div>
        </div>
      </WorkspaceSurface>

      <div className="grid gap-5 xl:grid-cols-2">
        <WorkspaceSurface>
          <WorkspaceSectionHeading
            title="Personal details"
            action={<UserRound size={17} className="text-blue-950" />}
          />
          <div className="p-4">
            <WorkspaceDetails
              rows={[
                ["Full name", teacher.fullName],
                ["Employee number", teacher.employeeCode],
                ["Email", teacher.email ?? operatingContext.userEmail],
                ["Phone", teacher.phone ?? "Not recorded"],
              ]}
            />
          </div>
        </WorkspaceSurface>
        <WorkspaceSurface>
          <WorkspaceSectionHeading
            title="Employment"
            action={<BriefcaseBusiness size={17} className="text-blue-950" />}
          />
          <div className="p-4">
            <WorkspaceDetails
              rows={[
                ["Designation", readable(teacher.designation)],
                ["Department", teacher.department ?? "Not recorded"],
                ["Staff type", readable(teacher.staffType)],
                ["Employment type", readable(teacher.employmentType)],
                ["Joining date", date(teacher.joiningDate)],
                [
                  "Primary campus",
                  workspace.campusBreakdown.find(
                    (campus) => campus.campusId === teacher.primaryCampusId,
                  )?.campusName ?? operatingContext.campusName,
                ],
              ]}
            />
          </div>
        </WorkspaceSurface>
      </div>

      <WorkspaceSurface>
        <WorkspaceSectionHeading
          title="Teaching assignments"
          description={`${workspace.academicYear.name} · ${workspace.assignments.length} active assignment${workspace.assignments.length === 1 ? "" : "s"}`}
          action={<GraduationCap size={17} className="text-blue-950" />}
        />
        {workspace.assignments.length ? (
          <div className="divide-y divide-slate-100">
            {workspace.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px] md:items-center"
              >
                <span>
                  <strong className="block text-xs text-slate-950">{assignment.subjectName}</strong>
                  <small className="text-[10px] text-slate-500">{assignment.campusName}</small>
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {[assignment.className, assignment.sectionName ?? assignment.subjectBatchName]
                    .filter(Boolean)
                    .join(" - ") || "Assigned group"}
                </span>
                <WorkspaceStatus tone={assignment.status === "COMPLETE" ? "success" : "warning"}>
                  {assignment.status === "COMPLETE" ? "Scheduled" : "Incomplete"}
                </WorkspaceStatus>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
            No active teaching assignments exist for this academic year.
          </p>
        )}
      </WorkspaceSurface>

      <WorkspaceSurface>
        <WorkspaceSectionHeading
          title="Academic responsibilities"
          description="Current non-teaching academic responsibilities and scope."
          action={<ShieldCheck size={17} className="text-blue-950" />}
        />
        {workspace.responsibilities.length ? (
          <div className="divide-y divide-slate-100">
            {workspace.responsibilities.map((responsibility) => (
              <div
                key={responsibility.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_180px] md:items-center"
              >
                <strong className="text-xs text-slate-950">
                  {readable(responsibility.responsibilityType)}
                </strong>
                <span className="text-xs font-semibold text-slate-600">
                  {[responsibility.campusName, responsibility.className, responsibility.sectionName]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  From {date(responsibility.effectiveFrom)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
            No additional academic responsibilities are assigned.
          </p>
        )}
      </WorkspaceSurface>
    </div>
  );
}
