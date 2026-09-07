import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
  CurriculumSubject,
  SubjectCatalogueItem,
  SubjectComponent,
} from "../../academic-planning/model/academic-planning.types";
import type { AddClassSubjectInput } from "../hooks/use-class-setup";

const fieldClass =
  "mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

interface Props {
  curriculumSubjects: CurriculumSubject[];
  catalogue: SubjectCatalogueItem[];
  components: SubjectComponent[];
  busy: boolean;
  onAdd: (input: AddClassSubjectInput) => Promise<void>;
}

export function AddClassSubjectDialog({
  curriculumSubjects,
  catalogue,
  components,
  busy,
  onAdd,
}: Props) {
  const [open, setOpen] = useState(false);
  const [curriculumSubjectId, setCurriculumSubjectId] = useState("");
  const [periods, setPeriods] = useState<Record<string, string>>({});
  const catalogueNames = useMemo(
    () => new Map(catalogue.map((item) => [item.id, item.name])),
    [catalogue],
  );
  const selected = curriculumSubjects.find((item) => item.id === curriculumSubjectId);
  const selectedComponents = useMemo(
    () =>
      components.filter(
        (item) => item.curriculumSubjectId === curriculumSubjectId && item.status === "ACTIVE",
      ),
    [components, curriculumSubjectId],
  );

  useEffect(() => {
    setPeriods(
      Object.fromEntries(
        selectedComponents.map((item) => [item.id, String(item.baselinePeriodsPerWeek ?? 1)]),
      ),
    );
  }, [selectedComponents]);

  const submit = async () => {
    try {
      await onAdd({
        curriculumSubjectId,
        periodsByComponent: Object.fromEntries(
          selectedComponents.map((item) => [item.id, Number(periods[item.id] ?? 1)]),
        ),
      });
      setOpen(false);
      setCurriculumSubjectId("");
      setPeriods({});
    } catch {
      // The Class Setup page displays the operation failure.
    }
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} disabled={!curriculumSubjects.length}>
        <Plus className="h-4 w-4" /> Add class subject
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add class subject</DialogTitle>
            <DialogDescription>
              Select a subject already mapped to this class curriculum and confirm its weekly
              teaching requirement.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="block text-xs font-semibold text-slate-700">
              Subject
              <select
                className={fieldClass}
                value={curriculumSubjectId}
                onChange={(event) => setCurriculumSubjectId(event.target.value)}
              >
                <option value="">Select subject</option>
                {curriculumSubjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogueNames.get(item.subjectCatalogueId) ?? "Configured subject"}
                  </option>
                ))}
              </select>
            </label>
            {selected && selectedComponents.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                {selectedComponents.map((component) => (
                  <label
                    key={component.id}
                    className="grid items-center gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-[1fr_140px]"
                  >
                    <span>{component.componentType.replaceAll("_", " ")}</span>
                    <input
                      className={fieldClass}
                      type="text"
                      inputMode="numeric"
                      value={periods[component.id] ?? ""}
                      onChange={(event) =>
                        setPeriods((current) => ({
                          ...current,
                          [component.id]: event.target.value.replace(/\D/g, ""),
                        }))
                      }
                      aria-label={`${component.componentType} periods per week`}
                    />
                  </label>
                ))}
              </div>
            )}
            {selected && !selectedComponents.length && (
              <p className="mt-4 text-sm font-medium text-amber-700">
                This curriculum subject has no active teaching component.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !selected ||
                !selectedComponents.length ||
                selectedComponents.some((item) => Number(periods[item.id]) < 1)
              }
              onClick={() => void submit()}
            >
              Add subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
