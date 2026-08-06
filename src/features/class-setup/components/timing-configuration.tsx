import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { PeriodSet, PeriodSlot } from "../../academic-planning/model/academic-planning.types";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../shared/ui/dialog";
import type { ClassSetupTimingInput } from "../hooks/use-class-setup";

const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const control = "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

interface SlotDraft {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  slotType: "TEACHING" | "BREAK" | "LUNCH" | "ASSEMBLY" | "ACTIVITY";
}

interface Props {
  academicUnitId: string | undefined;
  academicYearStart: string;
  academicYearEnd: string;
  periodSets: PeriodSet[];
  slots: PeriodSlot[];
  busy: boolean;
  onSave: (input: ClassSetupTimingInput) => Promise<void>;
}

const defaultSlots: SlotDraft[] = [
  { key: "p1", label: "Period 1", startTime: "08:30", endTime: "09:15", slotType: "TEACHING" },
  { key: "p2", label: "Period 2", startTime: "09:15", endTime: "10:00", slotType: "TEACHING" },
  { key: "break", label: "Break", startTime: "10:00", endTime: "10:15", slotType: "BREAK" },
  { key: "p3", label: "Period 3", startTime: "10:15", endTime: "11:00", slotType: "TEACHING" },
  { key: "p4", label: "Period 4", startTime: "11:00", endTime: "11:45", slotType: "TEACHING" },
  { key: "lunch", label: "Lunch", startTime: "11:45", endTime: "12:30", slotType: "LUNCH" },
  { key: "p5", label: "Period 5", startTime: "12:30", endTime: "13:15", slotType: "TEACHING" },
  { key: "p6", label: "Period 6", startTime: "13:15", endTime: "14:00", slotType: "TEACHING" },
];

export function TimingConfiguration({ academicUnitId, academicYearStart, academicYearEnd, periodSets, slots, busy, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Regular working day");
  const [days, setDays] = useState(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
  const [drafts, setDrafts] = useState<SlotDraft[]>(defaultSlots);
  const current = periodSets[0];
  const currentSlots = useMemo(() => slots.filter((item) => item.periodSetId === current?.id).sort((a, b) => a.sequence - b.sequence), [current?.id, slots]);

  const updateSlot = (key: string, patch: Partial<SlotDraft>) => setDrafts((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item));
  const addSlot = () => setDrafts((items) => [...items, { key: crypto.randomUUID(), label: `Period ${items.filter((item) => item.slotType === "TEACHING").length + 1}`, startTime: "14:00", endTime: "14:45", slotType: "TEACHING" }]);
  const valid = Boolean(academicUnitId && name.trim() && days.length && drafts.length && drafts.every((item) => item.label.trim() && item.startTime && item.endTime));

  const openEditor = () => {
    setError(null);
    setName(current?.name ?? "Regular working day");
    setDays(current?.applicableDays?.length ? current.applicableDays : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
    setDrafts(currentSlots.length ? currentSlots.map((slot) => ({ key: slot.id, label: slot.label, startTime: slot.startTime, endTime: slot.endTime, slotType: slot.slotType as SlotDraft["slotType"] })) : defaultSlots);
    setOpen(true);
  };

  const save = async () => {
    if (!valid || !academicUnitId) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        effectiveFrom: new Date(academicYearStart).toISOString(),
        effectiveUntil: new Date(academicYearEnd).toISOString(),
        applicableDays: days,
        slots: [...drafts].sort((left, right) => left.startTime.localeCompare(right.startTime)).map((slot) => ({ label: slot.label.trim(), startTime: slot.startTime, endTime: slot.endTime, slotType: slot.slotType })),
      });
      setOpen(false);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save working-day timings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 text-blue-700" />
          <div>
            <p className="text-sm font-bold text-slate-950">Working-day timings</p>
            <p className="mt-1 text-xs text-slate-500">
              {current ? `${current.name}: ${current.applicableDays.length} days, ${currentSlots.length} slots` : "Configure periods and breaks once before generating the class timetable."}
            </p>
          </div>
        </div>
        <Button variant="outline" disabled={busy || !academicUnitId} onClick={openEditor}>{current ? <Pencil /> : <Clock3 />}{current ? "Edit timings" : "Configure timings"}</Button>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader><DialogTitle>Working-day timings</DialogTitle><DialogDescription>Define teaching periods and breaks for this academic unit.</DialogDescription></DialogHeader>
              <DialogBody>
                {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
                <label className="block text-xs font-semibold text-slate-700">Configuration name<input className={`${control} mt-1`} value={name} onChange={(event) => setName(event.target.value)} /></label>
                <fieldset><legend className="text-xs font-semibold text-slate-700">Working days</legend><div className="mt-2 flex flex-wrap gap-3">{weekdays.map((item) => <label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={days.includes(item)} onChange={(event) => setDays((values) => event.target.checked ? [...values, item] : values.filter((value) => value !== item))} />{item.charAt(0) + item.slice(1).toLowerCase()}</label>)}</div></fieldset>
                <div className="overflow-x-auto border border-slate-200">
                  <table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50"><tr><th className="p-2 text-left">Label</th><th className="p-2 text-left">Start</th><th className="p-2 text-left">End</th><th className="p-2 text-left">Type</th><th className="w-12 p-2"><span className="sr-only">Actions</span></th></tr></thead><tbody>{drafts.map((slot) => <tr key={slot.key} className="border-t border-slate-200"><td className="p-2"><input className={control} value={slot.label} onChange={(event) => updateSlot(slot.key, { label: event.target.value })} /></td><td className="p-2"><input type="time" className={control} value={slot.startTime} onChange={(event) => updateSlot(slot.key, { startTime: event.target.value })} /></td><td className="p-2"><input type="time" className={control} value={slot.endTime} onChange={(event) => updateSlot(slot.key, { endTime: event.target.value })} /></td><td className="p-2"><select className={control} value={slot.slotType} onChange={(event) => updateSlot(slot.key, { slotType: event.target.value as SlotDraft["slotType"] })}><option value="TEACHING">Teaching</option><option value="BREAK">Break</option><option value="LUNCH">Lunch</option><option value="ASSEMBLY">Assembly</option><option value="ACTIVITY">Activity</option></select></td><td className="p-2"><button type="button" className="p-2 text-rose-700" aria-label={`Remove ${slot.label}`} onClick={() => setDrafts((items) => items.filter((item) => item.key !== slot.key))}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table>
                </div>
                <Button type="button" variant="outline" onClick={addSlot}><Plus />Add period or break</Button>
              </DialogBody>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!valid || saving} onClick={() => void save()}>{saving ? "Saving..." : "Save timings"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
      {current && <div className="mt-3 flex flex-wrap gap-2">{currentSlots.map((slot) => <span key={slot.id} className="border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">{slot.label} {slot.startTime}-{slot.endTime}</span>)}</div>}
    </div>
  );
}
