import { AcademicStructureManagement } from "../../features/academic-structure/ui/academic-structure-management";
import { AcademicYearsManagement } from "../../features/tenant-settings/ui/academic-years-management";
import { CalendarDays, FolderTree } from "lucide-react";
import { useState } from "react";

export function AdminAcademicStructurePage() {
  const [view, setView] = useState<"structure" | "year">("structure");
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Academic Setup</h1>
        <p className="mt-1 text-xs text-slate-500">
          Configure the operating year and campus academic hierarchy.
        </p>
      </header>
      <div
        className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1"
        role="tablist"
        aria-label="Academic setup views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "structure"}
          onClick={() => setView("structure")}
          className={`inline-flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold ${view === "structure" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"}`}
        >
          <FolderTree size={14} /> Interactive Structure Tree
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "year"}
          onClick={() => setView("year")}
          className={`inline-flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold ${view === "year" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"}`}
        >
          <CalendarDays size={14} /> Academic Year
        </button>
      </div>
      {view === "structure" ? <AcademicStructureManagement /> : <AcademicYearsManagement />}
    </section>
  );
}
