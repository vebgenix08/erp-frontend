import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  SectionFollowUp,
  SectionFollowUpType,
  SectionFollowUpVisibility,
  TeacherSectionWorkspaceResult,
} from "../model/teacher-section.types";
export async function getTeacherSectionWorkspace(input: {
  academicYearId?: string;
  sectionId?: string;
  date?: string;
}) {
  const result = await graphqlClient<
    { teacherSectionWorkspace: TeacherSectionWorkspaceResult },
    { input: typeof input }
  >(
    `query TeacherSectionWorkspace($input:TeacherSectionWorkspaceInput!){teacherSectionWorkspace(input:$input){section{id name classId className campusId} availableSections{id name className campusId} summary{totalStudents presentToday absentToday attendanceSessionsToday openFollowUps marksSheetsSubmitted marksSheetsPending} students{studentId studentName admissionNumber registrationNumber rollNumber guardianName guardianPhone attendanceStatusToday openFollowUps} timetable{id dayOfWeek startTime endTime subjectName teacherName} followUps{id studentId followUpType summary nextAction followUpDate visibility status version updatedAt}}}`,
    { input },
  );
  return result.teacherSectionWorkspace;
}
export async function saveTeacherSectionFollowUp(input: {
  id?: string;
  expectedVersion?: number;
  academicYearId: string;
  sectionId: string;
  studentId: string;
  followUpType: SectionFollowUpType;
  summary: string;
  nextAction?: string;
  followUpDate?: string;
  visibility: SectionFollowUpVisibility;
}) {
  const result = await graphqlClient<
    { saveTeacherSectionFollowUp: SectionFollowUp },
    { input: typeof input }
  >(
    `mutation SaveTeacherSectionFollowUp($input:SaveSectionFollowUpInput!){saveTeacherSectionFollowUp(input:$input){id studentId followUpType summary nextAction followUpDate visibility status version updatedAt}}`,
    { input },
  );
  return result.saveTeacherSectionFollowUp;
}
export async function resolveTeacherSectionFollowUp(input: {
  id: string;
  expectedVersion: number;
}) {
  const result = await graphqlClient<
    { resolveTeacherSectionFollowUp: SectionFollowUp },
    { input: typeof input }
  >(
    `mutation ResolveTeacherSectionFollowUp($input:ResolveSectionFollowUpInput!){resolveTeacherSectionFollowUp(input:$input){id studentId followUpType summary nextAction followUpDate visibility status version updatedAt}}`,
    { input },
  );
  return result.resolveTeacherSectionFollowUp;
}
