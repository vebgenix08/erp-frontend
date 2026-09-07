import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  MentorInteraction,
  MentorInteractionStatus,
  MentorInteractionType,
  MentorInteractionVisibility,
  TeacherMenteeWorkspaceResult,
  TeacherMentoringPageResult,
} from "../model/teacher-mentoring.types";

export async function listTeacherMentees(input: {
  academicYearId?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const result = await graphqlClient<
    { teacherMentees: TeacherMentoringPageResult },
    { input: typeof input }
  >(
    `query TeacherMentees($input:TeacherMentoringPageInput!){teacherMentees(input:$input){items{assignmentId studentId studentName registrationNumber rollNumber campusId className sectionName guardianName guardianPhone lastInteractionAt nextFollowUpDate openActionCount} page pageSize total totalPages pendingFollowUps openActions}}`,
    { input },
  );
  return result.teacherMentees;
}

export async function getTeacherMenteeWorkspace(assignmentId: string) {
  const result = await graphqlClient<
    { teacherMenteeWorkspace: TeacherMenteeWorkspaceResult },
    { input: { assignmentId: string } }
  >(
    `query TeacherMenteeWorkspace($input:TeacherMenteeWorkspaceInput!){teacherMenteeWorkspace(input:$input){mentee{assignmentId studentId studentName registrationNumber rollNumber campusId className sectionName guardianName guardianPhone lastInteractionAt nextFollowUpDate openActionCount} interactions{id assignmentId interactionType interactionDate summary actionItems followUpDate visibility status version updatedAt}}}`,
    { input: { assignmentId } },
  );
  return result.teacherMenteeWorkspace;
}

export async function saveTeacherMentorInteraction(input: {
  id?: string;
  expectedVersion?: number;
  assignmentId: string;
  interactionType: MentorInteractionType;
  interactionDate: string;
  summary: string;
  actionItems: string[];
  followUpDate?: string;
  visibility: MentorInteractionVisibility;
}) {
  const result = await graphqlClient<
    { saveTeacherMentorInteraction: MentorInteraction },
    { input: typeof input }
  >(
    `mutation SaveTeacherMentorInteraction($input:SaveMentorInteractionInput!){saveTeacherMentorInteraction(input:$input){id assignmentId interactionType interactionDate summary actionItems followUpDate visibility status version updatedAt}}`,
    { input },
  );
  return result.saveTeacherMentorInteraction;
}

export async function setTeacherMentorInteractionStatus(input: {
  id: string;
  expectedVersion: number;
  status: Exclude<MentorInteractionStatus, "OPEN">;
}) {
  const result = await graphqlClient<
    { setTeacherMentorInteractionStatus: MentorInteraction },
    { input: typeof input }
  >(
    `mutation SetTeacherMentorInteractionStatus($input:SetMentorInteractionStatusInput!){setTeacherMentorInteractionStatus(input:$input){id assignmentId interactionType interactionDate summary actionItems followUpDate visibility status version updatedAt}}`,
    { input },
  );
  return result.setTeacherMentorInteractionStatus;
}
