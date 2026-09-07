import { Building2, Calendar } from "lucide-react";
import { useSelectedAcademicYear } from "../../features/tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../features/tenant-settings/model/selected-campus-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../shared/ui/select";
import { cn } from "../../shared/ui/utils";

export function OperatingContextControls() {
  const {
    campuses,
    selectedCampus,
    loading: campusesLoading,
    error: campusError,
    selectCampus,
  } = useSelectedCampus();
  const {
    academicYears,
    selectedAcademicYear,
    loading: yearsLoading,
    selectAcademicYear,
  } = useSelectedAcademicYear();

  return (
    <div className="flex items-center gap-2.5">
      {/* Campus Selector Pill */}
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-xl border bg-white px-3 py-1 text-xs shadow-2xs transition-all hover:border-slate-300",
          campusError ? "border-rose-200 bg-rose-50" : "border-slate-200",
        )}
      >
        <Building2 size={15} className="shrink-0 text-brand-600" />
        <div className="flex flex-col min-w-0 justify-center">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">
            Campus
          </span>
          <Select
            disabled={campusesLoading || !campuses.length}
            value={selectedCampus?.id ?? ""}
            onValueChange={(val) => selectCampus(val)}
          >
            <SelectTrigger
              aria-label="Operating campus"
              className="h-5 border-0 bg-transparent p-0 text-xs font-bold text-slate-900 shadow-none focus:ring-0 gap-1.5 min-w-[130px]"
            >
              <SelectValue placeholder={campusesLoading ? "Loading..." : "Select campus"} />
            </SelectTrigger>
            <SelectContent
              align="start"
              className="min-w-[180px] bg-white border border-slate-200 shadow-lg rounded-xl p-1"
            >
              {campuses.map((campus) => (
                <SelectItem
                  key={campus.id}
                  value={campus.id}
                  className="text-xs font-semibold py-2 pl-3 pr-9 cursor-pointer rounded-lg"
                >
                  {campus.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Academic Year Selector Pill */}
      <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs shadow-2xs transition-all hover:border-slate-300">
        <Calendar size={15} className="shrink-0 text-brand-600" />
        <div className="flex flex-col min-w-0 justify-center">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">
            Academic Year
          </span>
          <Select
            disabled={yearsLoading || !academicYears.length}
            value={selectedAcademicYear?.id ?? ""}
            onValueChange={(val) => selectAcademicYear(val)}
          >
            <SelectTrigger
              aria-label="Operating academic year"
              className="h-6 border-0 bg-transparent p-0 text-xs font-bold text-slate-900 shadow-none focus:ring-0 gap-1.5 min-w-[130px]"
            >
              <SelectValue placeholder={yearsLoading ? "Loading..." : "Select year"} />
            </SelectTrigger>
            <SelectContent
              align="start"
              className="min-w-[200px] bg-white border border-slate-200 shadow-lg rounded-xl p-1"
            >
              {academicYears.map((year) => (
                <SelectItem
                  key={year.id}
                  value={year.id}
                  className="text-xs font-semibold py-2 pl-3 pr-9 cursor-pointer rounded-lg"
                >
                  {year.name} ({year.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
