import type { TeacherDepartmentWorkspace } from "../model/teacher-department.types";

type Timetable = TeacherDepartmentWorkspace["timetables"][number];
type Slot = Timetable["slots"][number];
const timetableDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const appliesToDay = (slot: Slot, day: string) =>
  !slot.applicableDays?.length || slot.applicableDays.includes(day);

function groupSlots(slots: Slot[]) {
  const groups = new Map<string, Slot[]>();
  for (const slot of [...slots].sort(
    (left, right) =>
      left.sequence - right.sequence || left.startTime.localeCompare(right.startTime),
  )) {
    const key = `${slot.sequence}:${slot.slotType}`;
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  return [...groups.values()];
}

function slotForDay(slots: Slot[], day: string) {
  return slots.find((slot) => appliesToDay(slot, day));
}

function NonTeachingCells({ slots, workingDays }: { slots: Slot[]; workingDays: string[] }) {
  const workingDaySet = new Set(workingDays);
  const segments: Array<{ key: string; slot?: Slot; span: number }> = [];
  for (const day of timetableDays) {
    const slot = workingDaySet.has(day) ? slotForDay(slots, day) : undefined;
    const key = slot
      ? `${slot.label}:${slot.startTime}:${slot.endTime}:${slot.slotType}`
      : workingDaySet.has(day)
        ? "not-configured"
        : "non-working";
    const previous = segments.at(-1);
    if (previous?.key === key) previous.span += 1;
    else segments.push({ key, ...(slot ? { slot } : {}), span: 1 });
  }
  const hasDifferentTimes =
    new Set(slots.map((slot) => `${slot.startTime}:${slot.endTime}`)).size > 1;
  return segments.map((segment, index) => (
    <td
      key={`${segment.key}:${index}`}
      colSpan={segment.span}
      className="border-l border-slate-200 bg-slate-50 px-3 py-2 text-center font-medium text-slate-600"
    >
      {segment.slot ? (
        <>
          {segment.slot.label}
          {hasDifferentTimes ? (
            <span className="ml-2 text-xs font-normal text-slate-500">
              {segment.slot.startTime} - {segment.slot.endTime}
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-slate-400">
          {segment.key === "non-working" ? "Non-working day" : "Not scheduled"}
        </span>
      )}
    </td>
  ));
}

export function DepartmentTimetableGrid({ timetable }: { timetable: Timetable | null }) {
  if (!timetable?.slots.length || !timetable.workingDays.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No configured timetable for this section.
      </p>
    );
  }
  const workingDaySet = new Set(timetable.workingDays);

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
        <caption className="sr-only">
          {timetable.className} {timetable.sectionName} timetable
        </caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <th scope="col" className="w-32 p-3 text-left">
              Period / Time
            </th>
            {timetableDays.map((day) => (
              <th scope="col" key={day} className="p-3">
                {day.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupSlots(timetable.slots).map((rowSlots) => {
            const first = rowSlots[0]!;
            const commonTime = rowSlots.every(
              (slot) => slot.startTime === first.startTime && slot.endTime === first.endTime,
            );
            const isTeaching = first.slotType === "TEACHING";
            return (
              <tr
                key={`${first.sequence}:${first.slotType}`}
                className="border-b border-slate-200 last:border-0"
              >
                <th scope="row" className="bg-slate-50 p-2 text-left font-medium">
                  {first.label}
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {commonTime ? `${first.startTime} - ${first.endTime}` : "Times vary by day"}
                  </span>
                </th>
                {isTeaching ? (
                  timetableDays.map((day) => {
                    const slot = workingDaySet.has(day) ? slotForDay(rowSlots, day) : undefined;
                    const lessons = slot
                      ? timetable.entries.filter(
                          (item) => item.dayOfWeek === day && item.periodSlotIds.includes(slot.id),
                        )
                      : [];
                    return (
                      <td key={day} className="border-l border-slate-200 p-2 align-top">
                        {!slot ? (
                          <span className="text-slate-400">
                            {workingDaySet.has(day) ? "Not scheduled" : "Non-working day"}
                          </span>
                        ) : lessons.length ? (
                          lessons.map((lesson) => (
                            <div key={lesson.id} className="py-1">
                              {!commonTime ? (
                                <span className="mb-1 block text-xs text-slate-500">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              ) : null}
                              <strong className="block break-words font-semibold text-slate-900">
                                {lesson.subjectName}
                              </strong>
                              <span className="mt-1 block break-words text-xs text-slate-600">
                                {lesson.teacherNames.join(", ") || "Teacher not assigned"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400">Unallocated</span>
                        )}
                      </td>
                    );
                  })
                ) : (
                  <NonTeachingCells slots={rowSlots} workingDays={timetable.workingDays} />
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
