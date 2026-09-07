import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { PeriodSet, PeriodSlot } from "../../academic-planning/model/academic-planning.types";
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
import type { ClassSetupTimingInput } from "../hooks/use-class-setup";

const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const regularDays = weekdays.slice(0, 5);
const control =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

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
  { key: "break", label: "Short Break", startTime: "10:00", endTime: "10:15", slotType: "BREAK" },
  { key: "p3", label: "Period 3", startTime: "10:15", endTime: "11:00", slotType: "TEACHING" },
  { key: "p4", label: "Period 4", startTime: "11:00", endTime: "11:45", slotType: "TEACHING" },
  { key: "lunch", label: "Lunch", startTime: "11:45", endTime: "12:30", slotType: "LUNCH" },
  { key: "p5", label: "Period 5", startTime: "12:30", endTime: "13:15", slotType: "TEACHING" },
  { key: "p6", label: "Period 6", startTime: "13:15", endTime: "14:00", slotType: "TEACHING" },
];

const defaultSaturdaySlots: SlotDraft[] = [
  { key: "sat-p1", label: "Period 1", startTime: "08:00", endTime: "08:40", slotType: "TEACHING" },
  { key: "sat-p2", label: "Period 2", startTime: "08:40", endTime: "09:20", slotType: "TEACHING" },
  {
    key: "sat-break",
    label: "Short Break",
    startTime: "09:20",
    endTime: "09:35",
    slotType: "BREAK",
  },
  { key: "sat-p3", label: "Period 3", startTime: "09:35", endTime: "10:15", slotType: "TEACHING" },
  { key: "sat-p4", label: "Period 4", startTime: "10:15", endTime: "10:55", slotType: "TEACHING" },
  { key: "sat-p5", label: "Period 5", startTime: "10:55", endTime: "11:35", slotType: "TEACHING" },
];

const toDraft = (slot: PeriodSlot): SlotDraft => ({
  key: slot.id,
  label: slot.label,
  startTime: slot.startTime,
  endTime: slot.endTime,
  slotType: slot.slotType as SlotDraft["slotType"],
});

const addMinutes = (value: string, amount: number) => {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const total = (hours * 60 + minutes + amount) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const isValidSlotDraft = (slot: SlotDraft) =>
  Boolean(slot.label.trim() && slot.startTime && slot.endTime && slot.startTime < slot.endTime);

function SlotEditorTable({
  label,
  drafts,
  onChange,
}: {
  label: string;
  drafts: SlotDraft[];
  onChange: (drafts: SlotDraft[]) => void;
}) {
  const update = (key: string, patch: Partial<SlotDraft>) =>
    onChange(drafts.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const add = () => {
    const startTime = drafts.at(-1)?.endTime ?? "08:30";
    onChange([
      ...drafts,
      {
        key: crypto.randomUUID(),
        label: `Period ${drafts.filter((item) => item.slotType === "TEACHING").length + 1}`,
        startTime,
        endTime: addMinutes(startTime, 45),
        slotType: "TEACHING",
      },
    ]);
  };
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">{label}</h3>
        <Button type="button" variant="outline" onClick={add}>
          <Plus /> Add period or break
        </Button>
      </div>
      <div className="overflow-x-auto border border-slate-200">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Label</th>
              <th className="p-2 text-left">Start</th>
              <th className="p-2 text-left">End</th>
              <th className="p-2 text-left">Type</th>
              <th className="w-12 p-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((slot) => (
              <tr key={slot.key} className="border-t border-slate-200">
                <td className="p-2">
                  <input
                    className={control}
                    value={slot.label}
                    onChange={(event) => update(slot.key, { label: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="time"
                    className={control}
                    value={slot.startTime}
                    onChange={(event) => update(slot.key, { startTime: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="time"
                    className={control}
                    value={slot.endTime}
                    onChange={(event) => update(slot.key, { endTime: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <select
                    className={control}
                    value={slot.slotType}
                    onChange={(event) =>
                      update(slot.key, { slotType: event.target.value as SlotDraft["slotType"] })
                    }
                  >
                    <option value="TEACHING">Teaching</option>
                    <option value="BREAK">Break</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="ASSEMBLY">Assembly</option>
                    <option value="ACTIVITY">Activity</option>
                  </select>
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    className="p-2 text-rose-700"
                    aria-label={`Remove ${slot.label}`}
                    onClick={() => onChange(drafts.filter((item) => item.key !== slot.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TimingConfiguration({
  academicUnitId,
  academicYearStart,
  academicYearEnd,
  periodSets,
  slots,
  busy,
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Regular working day");
  const [days, setDays] = useState(weekdays);
  const [drafts, setDrafts] = useState<SlotDraft[]>(defaultSlots);
  const [customSaturday, setCustomSaturday] = useState(false);
  const [saturdayDrafts, setSaturdayDrafts] = useState<SlotDraft[]>(defaultSaturdaySlots);
  const current = periodSets[0];
  const currentSlots = useMemo(
    () =>
      slots
        .filter((item) => item.periodSetId === current?.id)
        .sort((left, right) => left.sequence - right.sequence),
    [current?.id, slots],
  );

  const validDrafts = (items: SlotDraft[]) =>
    items.length > 0 &&
    items.some((item) => item.slotType === "TEACHING") &&
    items.every(isValidSlotDraft);
  const hasRegularDays = days.some((day) => day !== "SATURDAY");
  const valid = Boolean(
    academicUnitId &&
      name.trim() &&
      days.length &&
      (!hasRegularDays || validDrafts(drafts)) &&
      (!customSaturday || (days.includes("SATURDAY") && validDrafts(saturdayDrafts))),
  );

  const openEditor = () => {
    setError(null);
    setName(current?.name ?? "Regular working day");
    setDays(current?.applicableDays?.length ? current.applicableDays : weekdays);
    const saturdayOnly = currentSlots.filter(
      (slot) => slot.applicableDays?.length === 1 && slot.applicableDays[0] === "SATURDAY",
    );
    const standard = currentSlots.filter(
      (slot) => !(slot.applicableDays?.length === 1 && slot.applicableDays[0] === "SATURDAY"),
    );
    setDrafts(standard.length ? standard.map(toDraft) : defaultSlots);
    setCustomSaturday(saturdayOnly.length > 0);
    setSaturdayDrafts(saturdayOnly.length ? saturdayOnly.map(toDraft) : defaultSaturdaySlots);
    setOpen(true);
  };

  const save = async () => {
    if (!valid || !academicUnitId) return;
    setSaving(true);
    setError(null);
    try {
      const standardApplicableDays = customSaturday
        ? days.filter((day) => day !== "SATURDAY")
        : days;
      const serialize = (items: SlotDraft[], applicableDays: string[]) =>
        [...items]
          .sort((left, right) => left.startTime.localeCompare(right.startTime))
          .map((slot) => ({
            label: slot.label.trim(),
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotType: slot.slotType,
            applicableDays,
          }));
      await onSave({
        name: name.trim(),
        effectiveFrom: new Date(academicYearStart).toISOString(),
        effectiveUntil: new Date(academicYearEnd).toISOString(),
        applicableDays: days,
        slots: [
          ...(standardApplicableDays.length ? serialize(drafts, standardApplicableDays) : []),
          ...(customSaturday ? serialize(saturdayDrafts, ["SATURDAY"]) : []),
        ],
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
          <Clock3 className="mt-0.5 h-5 w-5 text-blue-800" />
          <div>
            <p className="text-sm font-bold text-slate-950">Working-day timings</p>
            <p className="mt-1 text-xs text-slate-500">
              {current
                ? `${current.name}: ${current.applicableDays.length} days, ${currentSlots.length} slots`
                : "Configure working days, periods and breaks before generating the timetable."}
            </p>
          </div>
        </div>
        <Button variant="outline" disabled={busy || !academicUnitId} onClick={openEditor}>
          {current ? <Pencil /> : <Clock3 />}
          {current ? "Edit timings" : "Configure timings"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Working-day timings</DialogTitle>
            <DialogDescription>
              Use one schedule for regular days and an optional shorter schedule for Saturday.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {error ? (
              <div
                role="alert"
                className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
              >
                {error}
              </div>
            ) : null}
            <label className="block text-xs font-semibold text-slate-700">
              Configuration name
              <input
                className={`${control} mt-1`}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-700">Working days</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {weekdays.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={days.includes(item)}
                      onChange={(event) => {
                        setDays((values) =>
                          event.target.checked
                            ? [...values, item]
                            : values.filter((value) => value !== item),
                        );
                        if (item === "SATURDAY" && !event.target.checked) setCustomSaturday(false);
                      }}
                    />
                    {item.charAt(0) + item.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </fieldset>
            {days.includes("SATURDAY") ? (
              <label className="flex items-start gap-2 border-y border-slate-200 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={customSaturday}
                  onChange={(event) => setCustomSaturday(event.target.checked)}
                />
                <span>
                  <strong className="block text-slate-900">Saturday uses different timings</strong>
                  <span className="text-xs text-slate-500">
                    Enable this for an earlier start, shorter periods, fewer periods, or no lunch
                    break.
                  </span>
                </span>
              </label>
            ) : null}
            {hasRegularDays || !customSaturday ? (
              <SlotEditorTable
                label={customSaturday ? "Monday to Friday" : "Daily schedule"}
                drafts={drafts}
                onChange={setDrafts}
              />
            ) : null}
            {customSaturday ? (
              <SlotEditorTable
                label="Saturday schedule"
                drafts={saturdayDrafts}
                onChange={setSaturdayDrafts}
              />
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!valid || saving} onClick={() => void save()}>
              {saving ? "Saving..." : "Save timings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {current ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {regularDays.filter((day) => current.applicableDays.includes(day)).length ? (
            <span className="border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
              Monday-Friday configured
            </span>
          ) : null}
          {current.applicableDays.includes("SATURDAY") ? (
            <span className="border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
              Saturday configured
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
