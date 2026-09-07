import type { PeriodSlot, SubjectOffering, TeachingGroup } from "./academic-planning.types";

const clockMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

export const comparePeriodSlots = (left: PeriodSlot, right: PeriodSlot) => {
  const leftSequence = Number(left.sequence);
  const rightSequence = Number(right.sequence);
  const sequenceOrder =
    (Number.isFinite(leftSequence) ? leftSequence : Number.MAX_SAFE_INTEGER) -
    (Number.isFinite(rightSequence) ? rightSequence : Number.MAX_SAFE_INTEGER);

  return (
    sequenceOrder ||
    clockMinutes(left.startTime) - clockMinutes(right.startTime) ||
    left.label.localeCompare(right.label)
  );
};

export const filterOfferingsForSection = <
  T extends Pick<SubjectOffering, "id" | "sectionId" | "teachingGroupId">,
>(
  offerings: T[],
  teachingGroups: Array<Pick<TeachingGroup, "id" | "homeSectionId" | "sourceSectionIds">>,
  sectionId: string,
): T[] => {
  const groupIds = new Set(
    teachingGroups
      .filter(
        (group) => group.homeSectionId === sectionId || group.sourceSectionIds?.includes(sectionId),
      )
      .map((group) => group.id),
  );

  return offerings.filter(
    (offering) =>
      offering.sectionId === sectionId ||
      (offering.teachingGroupId ? groupIds.has(offering.teachingGroupId) : false),
  );
};
