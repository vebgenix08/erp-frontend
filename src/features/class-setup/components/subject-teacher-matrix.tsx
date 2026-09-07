import { useMemo, useState } from "react";
import { CheckSquare, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "../../../shared/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../shared/ui/dialog";
import type {
  ClassSetupWorkspace,
  SubjectComponent,
  SubjectPlan,
} from "../../academic-planning/model/academic-planning.types";
import type { Employee } from "../../staff/model/staff.types";

const selectClass =
  "h-9 w-full min-w-40 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

interface PendingAssignment {
  offeringId: string;
  employeeId: string;
  label: string;
}

interface Props {
  workspace: ClassSetupWorkspace;
  plans: SubjectPlan[];
  components: SubjectComponent[];
  sectionId?: string;
  employees: Employee[];
  employeeNames: Map<string, string>;
  busy: boolean;
  needsQualification: (offeringId: string, employeeId: string) => boolean;
  onAssign: (
    offeringId: string,
    employeeId: string,
    qualificationReference?: string,
  ) => Promise<void>;
  onUpdateSubject: (
    subjectPlanId: string,
    periodsByComponent: Record<string, number>,
  ) => Promise<void>;
  onRemoveSubject: (subjectPlanId: string, reason: string) => Promise<void>;
}

export function SubjectTeacherMatrix({
  workspace,
  plans,
  components,
  sectionId,
  employees,
  employeeNames,
  busy,
  needsQualification,
  onAssign,
  onUpdateSubject,
  onRemoveSubject,
}: Props) {
  const [pending, setPending] = useState<PendingAssignment | null>(null);
  const [qualificationReference, setQualificationReference] = useState("");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkTeacher, setBulkTeacher] = useState("");
  const [bulkSections, setBulkSections] = useState<string[]>([]);
  const [bulkReference, setBulkReference] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [periodDrafts, setPeriodDrafts] = useState<Record<string, string>>({});
  const [removingPlanId, setRemovingPlanId] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState("");

  const assignmentMap = useMemo(
    () =>
      new Map(
        workspace.assignments
          .filter((item) => item.assignmentRole === "PRIMARY" && item.status === "ACTIVE")
          .map((item) => [item.subjectOfferingId, item]),
      ),
    [workspace.assignments],
  );
  const offeringFor = (subjectPlanId: string, sectionId: string) =>
    workspace.offerings.find(
      (item) =>
        item.subjectPlanId === subjectPlanId &&
        item.sectionId === sectionId &&
        item.status === "ACTIVE",
    );
  const visibleSections = sectionId
    ? workspace.sections.filter((item) => item.id === sectionId)
    : workspace.sections;
  const editingPlan = plans.find((item) => item.id === editingPlanId);
  const editingComponents =
    editingPlan?.componentPlans.map((planComponent) => ({
      ...planComponent,
      component: components.find((item) => item.id === planComponent.subjectComponentId),
    })) ?? [];

  const openEdit = (subjectPlanId: string) => {
    const plan = plans.find((item) => item.id === subjectPlanId);
    if (!plan) return;
    setEditingPlanId(subjectPlanId);
    setPeriodDrafts(
      Object.fromEntries(
        plan.componentPlans.map((item) => [
          item.subjectComponentId,
          String(item.plannedPeriodsPerWeek),
        ]),
      ),
    );
  };

  const saveSubject = async () => {
    if (
      !editingPlanId ||
      editingComponents.some(
        (item) =>
          !/^\d+$/.test(periodDrafts[item.subjectComponentId] ?? "") ||
          Number(periodDrafts[item.subjectComponentId]) < 1,
      )
    )
      return;
    try {
      await onUpdateSubject(
        editingPlanId,
        Object.fromEntries(
          editingComponents.map((item) => [
            item.subjectComponentId,
            Number(periodDrafts[item.subjectComponentId]),
          ]),
        ),
      );
      setEditingPlanId(null);
    } catch {
      // The Class Setup page displays the operation failure.
    }
  };

  const removeSubject = async () => {
    if (!removingPlanId || !removalReason.trim()) return;
    try {
      await onRemoveSubject(removingPlanId, removalReason.trim());
      setRemovingPlanId(null);
      setRemovalReason("");
    } catch {
      // The Class Setup page displays the operation failure.
    }
  };

  const confirmAssignment = async () => {
    if (!pending) return;
    try {
      await onAssign(pending.offeringId, pending.employeeId, qualificationReference || undefined);
      setPending(null);
      setQualificationReference("");
    } catch {
      // The Class Setup page displays the operation failure.
    }
  };

  const applyBulk = async () => {
    if (!bulkSubject || !bulkTeacher || !bulkSections.length) return;
    const selectedOfferings = bulkSections
      .map((sectionId) => offeringFor(bulkSubject, sectionId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (
      selectedOfferings.some((item) => needsQualification(item.id, bulkTeacher)) &&
      !bulkReference.trim()
    )
      return;
    try {
      for (const offering of selectedOfferings) {
        await onAssign(offering.id, bulkTeacher, bulkReference || undefined);
      }
    } catch {
      return;
    }
    setBulkOpen(false);
    setBulkSubject("");
    setBulkTeacher("");
    setBulkSections([]);
    setBulkReference("");
  };

  return (
    <section id="subject-teachers">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Subjects and section teachers</h2>
          <p className="text-sm text-slate-500">
            Weekly requirements are class-level. Every section has its own explicit primary teacher.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setBulkOpen((value) => !value)}>
          <CheckSquare className="h-4 w-4" /> Bulk assign selected sections
        </Button>
      </div>

      {bulkOpen && (
        <div className="mb-4 border border-blue-200 bg-blue-50/50 p-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="text-xs font-semibold text-slate-700">
              Subject
              <select
                className={`${selectClass} mt-1`}
                value={bulkSubject}
                onChange={(event) => {
                  setBulkSubject(event.target.value);
                  setBulkSections([]);
                }}
              >
                <option value="">Select subject</option>
                {workspace.subjects.map((item) => (
                  <option key={item.subjectPlanId} value={item.subjectPlanId}>
                    {item.subjectName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Teacher
              <select
                className={`${selectClass} mt-1`}
                value={bulkTeacher}
                onChange={(event) => setBulkTeacher(event.target.value)}
              >
                <option value="">Select teacher</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Qualification reference when required
              <input
                className={`${selectClass} mt-1`}
                value={bulkReference}
                onChange={(event) => setBulkReference(event.target.value)}
                placeholder="Certificate, degree or verified record"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {workspace.sections.map((section) => {
              const available = Boolean(offeringFor(bulkSubject, section.id));
              return (
                <label
                  key={section.id}
                  className={`flex items-center gap-2 text-sm ${available ? "text-slate-700" : "text-slate-400"}`}
                >
                  <input
                    type="checkbox"
                    disabled={!available}
                    checked={bulkSections.includes(section.id)}
                    onChange={(event) =>
                      setBulkSections((current) =>
                        event.target.checked
                          ? [...current, section.id]
                          : current.filter((id) => id !== section.id),
                      )
                    }
                  />
                  {section.name}
                </label>
              );
            })}
            <Button
              className="ml-auto"
              disabled={busy || !bulkSubject || !bulkTeacher || !bulkSections.length}
              onClick={() => void applyBulk()}
            >
              <Users className="h-4 w-4" /> Apply assignment
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Subject</th>
              <th className="p-3 text-center">Periods / week</th>
              {visibleSections.map((section) => (
                <th key={section.id} className="p-3">
                  {section.name}
                </th>
              ))}
              <th className="w-24 p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workspace.subjects.map((subject) => (
              <tr key={subject.subjectPlanId} className="border-t border-slate-200 align-top">
                <td className="p-3">
                  <p className="font-bold text-slate-950">{subject.subjectName}</p>
                  <p
                    className={`mt-1 text-xs font-medium ${subject.status === "READY" ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    {subject.status === "READY" ? "Ready" : "Teacher assignment required"}
                  </p>
                </td>
                <td className="p-3 text-center font-semibold text-slate-700">
                  {subject.periodsPerWeek}
                </td>
                {visibleSections.map((section) => {
                  const offering = offeringFor(subject.subjectPlanId, section.id);
                  const assignment = offering ? assignmentMap.get(offering.id) : undefined;
                  return (
                    <td key={section.id} className="p-3">
                      {offering ? (
                        <select
                          aria-label={`${subject.subjectName} teacher for ${section.name}`}
                          className={selectClass}
                          value={assignment?.employeeId ?? ""}
                          disabled={busy}
                          onChange={(event) => {
                            const employeeId = event.target.value;
                            if (!employeeId || employeeId === assignment?.employeeId) return;
                            setPending({
                              offeringId: offering.id,
                              employeeId,
                              label: `${subject.subjectName} - ${section.name}`,
                            });
                            setQualificationReference("");
                          }}
                        >
                          <option value="">Not assigned</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.fullName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-medium text-amber-700">
                          Prepare subject offering
                        </span>
                      )}
                      {assignment && (
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {employeeNames.get(assignment.employeeId) ?? "Assigned teacher"}
                        </p>
                      )}
                    </td>
                  );
                })}
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title="Edit weekly allocation"
                      aria-label={`Edit ${subject.subjectName}`}
                      className="grid h-8 w-8 place-items-center rounded-md text-blue-700 hover:bg-blue-50 disabled:text-slate-300"
                      disabled={busy || workspace.currentVersion?.status === "PUBLISHED"}
                      onClick={() => openEdit(subject.subjectPlanId)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Remove class subject"
                      aria-label={`Remove ${subject.subjectName}`}
                      className="grid h-8 w-8 place-items-center rounded-md text-rose-700 hover:bg-rose-50 disabled:text-slate-300"
                      disabled={busy || workspace.currentVersion?.status === "PUBLISHED"}
                      onClick={() => {
                        setRemovingPlanId(subject.subjectPlanId);
                        setRemovalReason("");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!workspace.subjects.length && (
          <p className="p-10 text-center text-sm text-slate-500">
            No class subjects are configured for this academic year.
          </p>
        )}
      </div>

      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm subject teacher</DialogTitle>
            <DialogDescription>
              {pending?.label}. This changes the effective section assignment and updates matching
              draft lessons.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm font-semibold text-slate-900">
              {employees.find((item) => item.id === pending?.employeeId)?.fullName}
            </p>
            {pending && needsQualification(pending.offeringId, pending.employeeId) && (
              <label className="mt-4 block text-xs font-semibold text-slate-700">
                Qualification reference *
                <input
                  className={`${selectClass} mt-1`}
                  value={qualificationReference}
                  onChange={(event) => setQualificationReference(event.target.value)}
                  placeholder="Degree, certificate or verified staff record"
                />
                <span className="mt-1 block font-normal text-slate-500">
                  Required once because this employee is not yet verified for the subject.
                </span>
              </label>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !pending ||
                (needsQualification(pending.offeringId, pending.employeeId) &&
                  !qualificationReference.trim())
              }
              onClick={() => void confirmAssignment()}
            >
              Confirm assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingPlanId)}
        onOpenChange={(open) => {
          if (!open && !busy) setEditingPlanId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit weekly subject allocation</DialogTitle>
            <DialogDescription>
              Update the required periods for each teaching component. The draft timetable must be
              validated again.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              {editingComponents.map((item) => (
                <label
                  key={item.subjectComponentId}
                  className="block text-xs font-semibold text-slate-700"
                >
                  {item.component?.componentType?.replaceAll("_", " ") ?? "Teaching component"}
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`${selectClass} mt-1`}
                    value={periodDrafts[item.subjectComponentId] ?? ""}
                    onChange={(event) =>
                      setPeriodDrafts((current) => ({
                        ...current,
                        [item.subjectComponentId]: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setEditingPlanId(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !editingComponents.length ||
                editingComponents.some((item) => Number(periodDrafts[item.subjectComponentId]) < 1)
              }
              onClick={() => void saveSubject()}
            >
              Save allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(removingPlanId)}
        onOpenChange={(open) => {
          if (!open && !busy) setRemovingPlanId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove class subject</DialogTitle>
            <DialogDescription>
              This closes the academic-year subject plan and removes its draft timetable lessons and
              section teacher assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="block text-xs font-semibold text-slate-700">
              Reason *
              <input
                className={`${selectClass} mt-1`}
                value={removalReason}
                onChange={(event) => setRemovalReason(event.target.value)}
                placeholder="Curriculum change or subject replacement"
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setRemovingPlanId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !removalReason.trim()}
              onClick={() => void removeSubject()}
            >
              Remove subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
