export interface TeacherAssignmentOption {
  id: string;
  subjectOfferingId: string;
  className?: string;
  sectionName?: string;
  subjectBatchName?: string;
  subjectName: string;
}

export const assignmentLabel = (item: TeacherAssignmentOption) =>
  [item.className, item.sectionName ?? item.subjectBatchName, item.subjectName]
    .filter(Boolean)
    .join(" · ");

export const textareaClass =
  "w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
export const localDate = () => {
  const current = new Date();
  const offset = current.getTimezoneOffset() * 60_000;
  return new Date(current.getTime() - offset).toISOString().slice(0, 10);
};
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
