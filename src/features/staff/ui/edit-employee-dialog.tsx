import { Camera, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Campus } from "../../tenant-settings/model/settings.types";
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
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { updateEmployee } from "../api/staff.api";
import type {
  Employee,
  EmploymentType,
  StaffCategory,
  StaffType,
  UpdateEmployeeInput,
} from "../model/staff.types";
import { uploadFile } from "../../storage/api/files.api";
import { useUnsavedChanges } from "../../../shared/navigation/unsaved-changes";

const teachingTypes: Array<[StaffType, string]> = [
  ["PRINCIPAL", "Principal"],
  ["VICE_PRINCIPAL", "Vice principal"],
  ["DEAN", "Dean"],
  ["HOD", "Head of department"],
  ["ACADEMIC_COORDINATOR", "Academic coordinator"],
  ["TEACHER", "Teacher"],
  ["LECTURER", "Lecturer"],
  ["LAB_FACULTY", "Lab faculty"],
  ["OTHER", "Other"],
];
const nonTeachingTypes: Array<[StaffType, string]> = [
  ["ADMIN_STAFF", "Administrative staff"],
  ["SUPPORT_STAFF", "Support staff"],
  ["OTHER", "Other"],
];
const selectClass =
  "mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20";

interface EditForm {
  fullName: string;
  phone: string;
  staffCategory: StaffCategory;
  staffType: StaffType;
  employmentType: EmploymentType;
  designation: string;
  department: string;
  externalHrCode: string;
  primaryCampusId: string;
  campusIds: string[];
  joiningDate: string;
}

function fromEmployee(employee: Employee): EditForm {
  return {
    fullName: employee.fullName,
    phone: employee.phone ?? "",
    staffCategory: employee.staffCategory,
    staffType: employee.staffType,
    employmentType: employee.employmentType,
    designation: employee.designation ?? "",
    department: employee.department ?? "",
    externalHrCode: employee.externalHrCode ?? "",
    primaryCampusId: employee.primaryCampusId,
    campusIds: [...employee.campusIds],
    joiningDate: employee.joiningDate.slice(0, 10),
  };
}

function formSnapshot(form: EditForm) {
  return JSON.stringify({ ...form, campusIds: [...form.campusIds].sort() });
}

interface Props {
  employee: Employee;
  campuses: Campus[];
  disabled?: boolean;
  onUpdated: (employee: Employee) => void;
}

export function EditEmployeeDialog({ employee, campuses, disabled, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => fromEmployee(employee));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const dirty =
    open && (profilePhoto !== null || formSnapshot(form) !== formSnapshot(fromEmployee(employee)));
  const { requestDiscard } = useUnsavedChanges(`edit-employee-${employee.id}`, dirty);
  const staffTypes = useMemo(
    () => (form.staffCategory === "TEACHING" ? teachingTypes : nonTeachingTypes),
    [form.staffCategory],
  );
  const activeCampuses = campuses.filter(
    (campus) => campus.status === "ACTIVE" || form.campusIds.includes(campus.id),
  );

  useEffect(() => {
    if (open) {
      setForm(fromEmployee(employee));
      setError(null);
      setProfilePhoto(null);
    }
  }, [employee, open]);

  const setCategory = (staffCategory: StaffCategory) => {
    const options = staffCategory === "TEACHING" ? teachingTypes : nonTeachingTypes;
    setForm((value) => ({
      ...value,
      staffCategory,
      staffType: options.some(([type]) => type === value.staffType)
        ? value.staffType
        : options[0]![0],
    }));
  };

  const toggleCampus = (campusId: string, checked: boolean) => {
    setForm((value) => {
      const campusIds = checked
        ? [...new Set([...value.campusIds, campusId])]
        : value.campusIds.filter((id) => id !== campusId);
      return {
        ...value,
        campusIds,
        primaryCampusId: campusIds.includes(value.primaryCampusId)
          ? value.primaryCampusId
          : (campusIds[0] ?? ""),
      };
    });
  };

  const save = async () => {
    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!form.campusIds.length || !form.primaryCampusId) {
      setError("Select at least one campus and a primary campus.");
      return;
    }
    if (!form.joiningDate) {
      setError("Joining date is required.");
      return;
    }
    setSaving(true);
    setError(null);
    let uploadedFileId: string | undefined;
    try {
      if (profilePhoto) {
        const stored = await uploadFile({
          file: profilePhoto,
          scopeType: "TENANT",
          metadata: { category: "staff_profile", employeeId: employee.id },
        });
        uploadedFileId = stored.id;
      }
      const input: UpdateEmployeeInput = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        staffCategory: form.staffCategory,
        staffType: form.staffType,
        employmentType: form.employmentType,
        designation: form.designation.trim(),
        department: form.department.trim(),
        externalHrCode: form.externalHrCode.trim(),
        primaryCampusId: form.primaryCampusId,
        campusIds: form.campusIds,
        joiningDate: new Date(`${form.joiningDate}T00:00:00.000Z`).toISOString(),
        ...(uploadedFileId ? { profilePhotoFileId: uploadedFileId } : {}),
      };
      onUpdated(await updateEmployee(employee.id, input));
      setOpen(false);
    } catch (value) {
      // A lost save response does not prove the employee update failed.
      setError(value instanceof Error ? value.message : "Unable to update employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="h-9 px-3 text-xs font-semibold"
      >
        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit employee
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (saving) return;
          if (value) setOpen(true);
          else requestDiscard(() => setOpen(false));
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit employee</DialogTitle>
            <DialogDescription>
              Update employment details and campus access. Employee code and login email are managed
              separately.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {error && (
              <div
                role="alert"
                className="rounded border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
              >
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-full-name">Full name</Label>
                <Input
                  id="edit-full-name"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Staff category</Label>
                <select
                  id="edit-category"
                  className={selectClass}
                  value={form.staffCategory}
                  onChange={(event) => setCategory(event.target.value as StaffCategory)}
                >
                  <option value="TEACHING">Teaching</option>
                  <option value="NON_TEACHING">Non-teaching</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-staff-type">Staff type</Label>
                <select
                  id="edit-staff-type"
                  className={selectClass}
                  value={form.staffType}
                  onChange={(event) =>
                    setForm({ ...form, staffType: event.target.value as StaffType })
                  }
                >
                  {staffTypes.map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-employment-type">Employment type</Label>
                <select
                  id="edit-employment-type"
                  className={selectClass}
                  value={form.employmentType}
                  onChange={(event) =>
                    setForm({ ...form, employmentType: event.target.value as EmploymentType })
                  }
                >
                  <option value="FULL_TIME">Full time</option>
                  <option value="PART_TIME">Part time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="VISITING">Visiting</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-joining-date">Joining date</Label>
                <Input
                  id="edit-joining-date"
                  type="date"
                  value={form.joiningDate}
                  onChange={(event) => setForm({ ...form, joiningDate: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={form.designation}
                  onChange={(event) => setForm({ ...form, designation: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={form.department}
                  onChange={(event) => setForm({ ...form, department: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-hr-code">External HR code</Label>
                <Input
                  id="edit-hr-code"
                  value={form.externalHrCode}
                  onChange={(event) => setForm({ ...form, externalHrCode: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-profile-photo">Profile photo</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slate-400" />
                  <Input
                    id="edit-profile-photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setProfilePhoto(event.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-primary-campus">Primary campus</Label>
                <select
                  id="edit-primary-campus"
                  className={selectClass}
                  value={form.primaryCampusId}
                  onChange={(event) => setForm({ ...form, primaryCampusId: event.target.value })}
                >
                  <option value="">Select campus</option>
                  {activeCampuses
                    .filter((campus) => form.campusIds.includes(campus.id))
                    .map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-xs font-bold text-slate-700">Campus access</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {activeCampuses.map((campus) => (
                  <label key={campus.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.campusIds.includes(campus.id)}
                      onChange={(event) => toggleCampus(campus.id, event.target.checked)}
                    />
                    {campus.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
              <div>
                <span className="font-semibold text-slate-500">Employee code</span>
                <p className="mt-1 font-bold text-slate-900">{employee.employeeCode}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Login email</span>
                <p className="mt-1 font-bold text-slate-900">
                  {employee.email || "No login email"}
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => requestDiscard(() => setOpen(false))}
            >
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
