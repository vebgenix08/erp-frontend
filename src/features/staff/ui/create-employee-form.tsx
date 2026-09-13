import { ArrowLeft, Save, Send } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listIdentityRoles } from "../../access-control/api/access.api";
import type { IdentityRole } from "../../access-control/model/access.types";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { listTenantTemplates } from "../../tenant-settings/api/settings.api";
import type { TenantTemplate } from "../../tenant-settings/model/settings.types";
import { TemplateFields } from "../../tenant-settings/ui/template-fields";
import { createEmployee } from "../api/staff.api";
import { deleteFile, uploadFile } from "../../storage/api/files.api";
import type { EmploymentType, StaffCategory, StaffType } from "../model/staff.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Card, CardContent } from "../../../shared/ui/card";
import { Separator } from "../../../shared/ui/separator";

const teaching: Array<[StaffType, string]> = [
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

const nonTeaching: Array<[StaffType, string]> = [
  ["ADMIN_STAFF", "Administrative staff"],
  ["SUPPORT_STAFF", "Support staff"],
  ["OTHER", "Other"],
];

export function CreateEmployeeForm() {
  const navigate = useNavigate();
  const { campuses, selectedCampus } = useSelectedCampus();
  const [roles, setRoles] = useState<IdentityRole[]>([]);
  const [template, setTemplate] = useState<TenantTemplate | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    staffCategory: "TEACHING" as StaffCategory,
    staffType: "TEACHER" as StaffType,
    employmentType: "FULL_TIME" as EmploymentType,
    designation: "",
    department: "",
    primaryCampusId: selectedCampus?.id ?? "",
    campusIds: selectedCampus ? [selectedCampus.id] : ([] as string[]),
    joiningDate: new Date().toISOString().slice(0, 10),
    loginEnabled: false,
    roleIds: [] as string[],
    scopeType: "CAMPUS" as "TENANT" | "CAMPUS",
  });

  useEffect(() => {
    void Promise.all([listIdentityRoles(), listTenantTemplates()])
      .then(([roleItems, templates]) => {
        setRoles(roleItems.filter((item) => item.isActive));
        setTemplate(
          templates
            .filter((item) => item.layout === "STAFF_ONBOARDING" && item.status === "PUBLISHED")
            .sort(
              (left, right) =>
                (right.publishedVersion ?? right.version) - (left.publishedVersion ?? left.version),
            )[0] ?? null,
        );
      })
      .catch((value) =>
        setError(
          value instanceof Error ? value.message : "Unable to load employee form configuration",
        ),
      );
  }, []);

  useEffect(() => {
    if (!selectedCampus) return;
    setForm((value) =>
      value.primaryCampusId
        ? value
        : {
            ...value,
            primaryCampusId: selectedCampus.id,
            campusIds: [selectedCampus.id],
          },
    );
  }, [selectedCampus]);

  const staffTypes = useMemo(
    () => (form.staffCategory === "TEACHING" ? teaching : nonTeaching),
    [form.staffCategory],
  );
  const inviteTemplateField = template?.fields.find((field) =>
    field.label.toLowerCase().includes("portal activation invite"),
  );
  const profilePhotoField = template?.fields.find(
    (field) => field.label.trim().toLowerCase() === "profile photo",
  );

  const submit = async (event: FormEvent, invite: boolean) => {
    event.preventDefault();
    if (!template) {
      setError("Publish a staff onboarding template before creating employees.");
      return;
    }
    setBusy(true);
    setError(null);
    const uploadedFileIds: string[] = [];
    try {
      const email = form.email.trim(),
        phone = form.phone.trim(),
        designation = form.designation.trim(),
        department = form.department.trim();
      const uploadedCustomFields = { ...customFields };
      let profilePhotoFileId: string | undefined;
      for (const [fieldKey, value] of Object.entries(customFields)) {
        if (!(value instanceof File)) continue;
        const stored = await uploadFile({
          file: value,
          scopeType: "TENANT",
          metadata: {
            category: "staff_onboarding",
            fieldKey,
            ...(email ? { employeeEmail: email } : {}),
          },
        });
        uploadedFileIds.push(stored.id);
        if (fieldKey === profilePhotoField?.key) {
          profilePhotoFileId = stored.id;
          delete uploadedCustomFields[fieldKey];
        } else {
          uploadedCustomFields[fieldKey] = {
            fileId: stored.id,
            fileName: stored.fileName,
            contentType: stored.contentType,
          };
        }
      }
      const saved = await createEmployee({
        fullName: form.fullName,
        staffCategory: form.staffCategory,
        staffType: form.staffType,
        employmentType: form.employmentType,
        primaryCampusId: form.primaryCampusId,
        campusIds: form.campusIds,
        joiningDate: new Date(`${form.joiningDate}T00:00:00.000Z`).toISOString(),
        loginEnabled: invite,
        roleIds: invite ? form.roleIds : [],
        scopeType: form.scopeType,
        templateId: template.id,
        templateVersion: template.publishedVersion ?? template.version,
        customFields: uploadedCustomFields,
        ...(profilePhotoFileId ? { profilePhotoFileId } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(designation ? { designation } : {}),
        ...(department ? { department } : {}),
      });
      navigate(`/admin/staff/${saved.id}`);
    } catch (value) {
      await Promise.allSettled(uploadedFileIds.map((fileId) => deleteFile(fileId)));
      setError(value instanceof Error ? value.message : "Unable to create employee");
    } finally {
      setBusy(false);
    }
  };

  const fieldLabel = (key: string, fallback: string) =>
    template?.fields.find((field) => field.key === key)?.label ?? fallback;

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        to="/admin/staff"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Staff directory
      </Link>

      {/* Header */}
      <header>
        <h2 className="text-xl font-bold text-slate-900">Add employee</h2>
        <p className="mt-1 text-sm text-slate-500">
          {template
            ? `${template.name} · version ${template.publishedVersion ?? template.version}`
            : "A published staff onboarding template is required."}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!template && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          Publish a staff onboarding form under Setup → Templates before adding an employee.
        </div>
      )}

      {template && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={(e) => void submit(e, form.loginEnabled)} className="space-y-6">
              <fieldset disabled className="hidden" aria-hidden="true">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">{fieldLabel("fullName", "Full name")}</Label>
                  <Input
                    id="fullName"
                    required
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{fieldLabel("phone", "Phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                {/* Staff Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="staffCategory">
                    {fieldLabel("staffCategory", "Staff category")}
                  </Label>
                  <select
                    id="staffCategory"
                    value={form.staffCategory}
                    onChange={(e) => {
                      const staffCategory = e.target.value as StaffCategory;
                      setForm({
                        ...form,
                        staffCategory,
                        staffType: staffCategory === "TEACHING" ? "TEACHER" : "ADMIN_STAFF",
                      });
                    }}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
                  >
                    <option value="TEACHING">Teaching</option>
                    <option value="NON_TEACHING">Non-teaching</option>
                  </select>
                </div>

                {/* Staff Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="staffType">{fieldLabel("staffType", "Staff type")}</Label>
                  <select
                    id="staffType"
                    value={form.staffType}
                    onChange={(e) => setForm({ ...form, staffType: e.target.value as StaffType })}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
                  >
                    {staffTypes.map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employment Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="employmentType">
                    {fieldLabel("employmentType", "Employment type")}
                  </Label>
                  <select
                    id="employmentType"
                    value={form.employmentType}
                    onChange={(e) =>
                      setForm({ ...form, employmentType: e.target.value as EmploymentType })
                    }
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
                  >
                    <option value="FULL_TIME">Full time</option>
                    <option value="PART_TIME">Part time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="VISITING">Visiting</option>
                  </select>
                </div>

                {/* Joining Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="joiningDate">{fieldLabel("joiningDate", "Joining date")}</Label>
                  <Input
                    id="joiningDate"
                    required
                    type="date"
                    value={form.joiningDate}
                    onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  />
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  />
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                </div>

                {/* Primary Campus */}
                <div className="space-y-1.5">
                  <Label htmlFor="primaryCampusId">
                    {fieldLabel("primaryCampusId", "Primary campus")}
                  </Label>
                  <select
                    id="primaryCampusId"
                    required
                    value={form.primaryCampusId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setForm({ ...form, primaryCampusId: id, campusIds: [id] });
                    }}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
                  >
                    <option value="">Select campus</option>
                    {campuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Additional Campus Access */}
                <div className="space-y-1.5">
                  <Label>Additional campus access</Label>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2 max-h-32 overflow-y-auto">
                    {campuses.map((campus) => (
                      <label key={campus.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.campusIds.includes(campus.id)}
                          disabled={campus.id === form.primaryCampusId}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              campusIds: e.target.checked
                                ? [...form.campusIds, campus.id]
                                : form.campusIds.filter((id) => id !== campus.id),
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-accent-650 focus:ring-accent-600"
                        />
                        <span className="text-sm text-slate-705">{campus.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>

              {/* Template custom fields */}
              <TemplateFields
                template={template}
                values={{
                  ...customFields,
                  fullName: form.fullName,
                  email: form.email,
                  phone: form.phone,
                  staffCategory: form.staffCategory,
                  staffType: form.staffType,
                  employmentType: form.employmentType,
                  designation: form.designation,
                  department: form.department,
                  joiningDate: form.joiningDate,
                  primaryCampusId: form.primaryCampusId,
                  roleIds: form.roleIds,
                  ...(inviteTemplateField ? { [inviteTemplateField.key]: form.loginEnabled } : {}),
                }}
                systemKeys={[
                  "fullName",
                  "email",
                  "phone",
                  "staffCategory",
                  "staffType",
                  "employmentType",
                  "designation",
                  "department",
                  "joiningDate",
                  "primaryCampusId",
                  "roleIds",
                ]}
                onChange={(key, value) => {
                  if (key === inviteTemplateField?.key) {
                    setForm((current) => ({ ...current, loginEnabled: value === true }));
                    return;
                  }
                  if (
                    [
                      "fullName",
                      "email",
                      "phone",
                      "designation",
                      "department",
                      "joiningDate",
                    ].includes(key)
                  ) {
                    setForm((current) => ({ ...current, [key]: String(value ?? "") }));
                    return;
                  }
                  setCustomFields((current) => ({ ...current, [key]: value }));
                }}
                renderField={(field) => {
                  if (field.key === "staffCategory") {
                    return (
                      <select
                        required={field.required}
                        value={form.staffCategory}
                        onChange={(event) => {
                          const staffCategory = event.target.value as StaffCategory;
                          setForm((current) => ({
                            ...current,
                            staffCategory,
                            staffType: staffCategory === "TEACHING" ? "TEACHER" : "ADMIN_STAFF",
                          }));
                        }}
                        className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs"
                      >
                        <option value="TEACHING">Teaching</option>
                        <option value="NON_TEACHING">Non-teaching</option>
                      </select>
                    );
                  }
                  if (field.key === "staffType") {
                    return (
                      <select
                        required={field.required}
                        value={form.staffType}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            staffType: event.target.value as StaffType,
                          }))
                        }
                        className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs"
                      >
                        {staffTypes.map(([value, text]) => (
                          <option key={value} value={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                    );
                  }
                  if (field.key === "employmentType") {
                    return (
                      <select
                        required={field.required}
                        value={form.employmentType}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            employmentType: event.target.value as EmploymentType,
                          }))
                        }
                        className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs"
                      >
                        <option value="FULL_TIME">Full time</option>
                        <option value="PART_TIME">Part time</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="VISITING">Visiting</option>
                      </select>
                    );
                  }
                  if (field.key === "primaryCampusId") {
                    return (
                      <select
                        required={field.required}
                        value={form.primaryCampusId}
                        onChange={(event) => {
                          const primaryCampusId = event.target.value;
                          setForm((current) => ({
                            ...current,
                            primaryCampusId,
                            campusIds: primaryCampusId ? [primaryCampusId] : [],
                          }));
                        }}
                        className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs"
                      >
                        <option value="">Select campus</option>
                        {campuses.map((campus) => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name}
                          </option>
                        ))}
                      </select>
                    );
                  }
                  if (field.key === "roleIds") {
                    return (
                      <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                        {roles.map((role) => (
                          <label key={role.id} className="flex items-start gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={form.roleIds.includes(role.id)}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  roleIds: event.target.checked
                                    ? [...new Set([...current.roleIds, role.id])]
                                    : current.roleIds.filter((id) => id !== role.id),
                                }))
                              }
                            />
                            <span>
                              <strong className="block text-slate-800">{role.name}</strong>
                              <small className="text-slate-500">{role.description}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <div className="space-y-2">
                <Label>Additional campus access</Label>
                <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                  {campuses.map((campus) => (
                    <label key={campus.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.campusIds.includes(campus.id)}
                        disabled={campus.id === form.primaryCampusId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            campusIds: event.target.checked
                              ? [...new Set([...current.campusIds, campus.id])]
                              : current.campusIds.filter((id) => id !== campus.id),
                          }))
                        }
                      />
                      {campus.name}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Provisioning invite */}
              <div className="space-y-4">
                {form.loginEnabled && (
                  <div className="rounded-lg border border-slate-250 bg-slate-50/50 p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="login-email">Login email</Label>
                        <Input
                          id="login-email"
                          required
                          type="email"
                          autoComplete="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="login-scope">Access scope</Label>
                        <select
                          id="login-scope"
                          value={form.scopeType}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              scopeType: e.target.value as "TENANT" | "CAMPUS",
                            })
                          }
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
                        >
                          <option value="CAMPUS">Assigned campuses</option>
                          <option value="TENANT">All campuses</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" asChild>
                  <Link to="/admin/staff">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    !template ||
                    !form.primaryCampusId ||
                    (form.loginEnabled && (!form.email || !form.roleIds.length))
                  }
                >
                  {form.loginEnabled ? (
                    <>
                      <Send size={15} /> Create and send invite
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Create employee
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
