import { UserCheck } from "lucide-react";
import type { AcademicResponsibility } from "../../academic-planning/model/academic-planning.types";
import type { Employee } from "../../staff/model/staff.types";

const selectClass =
  "mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

interface Props {
  sections: Array<{ id: string; name: string }>;
  employees: Employee[];
  responsibilities: AcademicResponsibility[];
  studentCounts: Map<string, number>;
  busy: boolean;
  onAssign: (
    sectionId: string,
    employeeId: string,
    responsibilityType: "CLASS_TEACHER" | "SECTION_INCHARGE",
  ) => Promise<void>;
}

export function SectionOwnershipPanel({
  sections,
  employees,
  responsibilities,
  studentCounts,
  busy,
  onAssign,
}: Props) {
  return (
    <section className="border-t border-slate-200 pt-6" id="section-ownership">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-950">
          Section ownership{sections[0] ? ` - ${sections[0].name}` : ""}
        </h2>
        <p className="text-sm text-slate-500">
          Assign the class teacher and section incharge for the selected section. Subject teaching
          remains separate.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const classTeacher = responsibilities.find(
            (item) =>
              item.sectionId === section.id &&
              item.responsibilityType === "CLASS_TEACHER" &&
              item.status === "ACTIVE",
          );
          const sectionIncharge = responsibilities.find(
            (item) =>
              item.sectionId === section.id &&
              item.responsibilityType === "SECTION_INCHARGE" &&
              item.status === "ACTIVE",
          );
          return (
            <article key={section.id} className="border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-950">{section.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {studentCounts.get(section.id) ?? 0} active students
                  </p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <UserCheck className="h-4 w-4" />
                </span>
              </div>
              <label className="mt-4 block text-xs font-semibold text-slate-700">
                Class teacher
                <select
                  className={selectClass}
                  value={classTeacher?.employeeId ?? ""}
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.value)
                      void onAssign(section.id, event.target.value, "CLASS_TEACHER").catch(
                        () => undefined,
                      );
                  }}
                >
                  <option value="">Not assigned</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold text-slate-700">
                Section incharge
                <select
                  className={selectClass}
                  value={sectionIncharge?.employeeId ?? ""}
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.value)
                      void onAssign(section.id, event.target.value, "SECTION_INCHARGE").catch(
                        () => undefined,
                      );
                  }}
                >
                  <option value="">Not assigned</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          );
        })}
      </div>
      {!sections.length && (
        <p className="border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Create an active section before assigning class ownership.
        </p>
      )}
    </section>
  );
}
