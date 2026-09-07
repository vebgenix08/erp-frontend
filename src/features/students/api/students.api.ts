import { graphqlClient } from "../../../shared/api/graphql-client";
import type { Student } from "../model/student.types";

const fields =
  "id admissionApplicationId admissionNumber registrationNumber name dateOfBirth gender phone email address status createdAt updatedAt guardian { name phone relation } enrollment { id campusId academicYearId programId classId sectionId rollNumber status enrolledAt }";
export async function listStudents(filter: {
  campusId?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: Student["status"];
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return (
    await graphqlClient<{ students: Student[] }, { filter: typeof filter }>(
      `query Students($filter: StudentFilter) { students(filter:$filter) { ${fields} } }`,
      { filter },
    )
  ).students;
}
export interface StudentPage {
  items: Student[];
  overall: {
    total: number;
    active: number;
    inactive: number;
    missingSection: number;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sortBy: "name" | "admissionNumber" | "registrationNumber" | "createdAt";
  sortDirection: "ASC" | "DESC";
}
export interface StudentPageFilter {
  campusId?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: Student["status"];
  search?: string;
  page: number;
  pageSize: number;
  sortBy: StudentPage["sortBy"];
  sortDirection: StudentPage["sortDirection"];
}
export async function listStudentPage(filter: StudentPageFilter) {
  return (
    await graphqlClient<{ studentPage: StudentPage }, { filter: StudentPageFilter }>(
      `query StudentPage($filter: StudentFilter) { studentPage(filter:$filter) { items { ${fields} } overall { total active inactive missingSection } page pageSize total totalPages sortBy sortDirection } }`,
      { filter },
    )
  ).studentPage;
}
export async function getStudent(id: string) {
  return (
    await graphqlClient<{ student: Student }, { id: string }>(
      `query Student($id: ID!) { student(id:$id) { ${fields} } }`,
      { id },
    )
  ).student;
}
export interface UpdateStudentInput {
  name: string;
  dateOfBirth: string | null;
  gender: Student["gender"] | null;
  phone: string;
  email: string | null;
  address: string | null;
  guardianName: string;
  guardianPhone: string | null;
  guardianRelation: string | null;
}
export async function updateStudent(id: string, input: UpdateStudentInput) {
  const normalizedInput = {
    ...input,
    dateOfBirth: input.dateOfBirth
      ? new Date(`${input.dateOfBirth.slice(0, 10)}T00:00:00.000Z`).toISOString()
      : null,
  };
  return (
    await graphqlClient<{ updateStudent: Student }, { id: string; input: UpdateStudentInput }>(
      `mutation UpdateStudent($id: ID!, $input: UpdateStudentInput!) { updateStudent(id:$id,input:$input) { ${fields} } }`,
      { id, input: normalizedInput },
    )
  ).updateStudent;
}
export async function getStudentByAdmissionApplicationId(id: string) {
  return (
    await graphqlClient<{ studentByAdmissionApplicationId: Student }, { id: string }>(
      `query StudentByAdmissionApplicationId($id: ID!) { studentByAdmissionApplicationId(id:$id) { ${fields} } }`,
      { id },
    )
  ).studentByAdmissionApplicationId;
}
export async function changeStudentEnrollment(
  id: string,
  input: {
    campusId: string;
    academicYearId: string;
    classId: string;
    sectionId?: string;
    reason: string;
  },
) {
  return (
    await graphqlClient<{ changeStudentEnrollment: Student }, { id: string; input: typeof input }>(
      `mutation ChangeStudentEnrollment($id: ID!, $input: ChangeStudentEnrollmentInput!) { changeStudentEnrollment(id:$id,input:$input) { ${fields} } }`,
      { id, input },
    )
  ).changeStudentEnrollment;
}
export interface CampusTransfer {
  id: string;
  studentId: string;
  studentName: string;
  clientRequestId: string;
  registrationNumber: string;
  targetRegistrationNumber: string;
  source: {
    campusId: string;
    academicYearId: string;
    programId: string;
    classId: string;
    sectionId?: string;
    enrollmentId: string;
    rollNumber?: string;
  };
  target: {
    campusId: string;
    academicYearId: string;
    programId: string;
    classId: string;
    sectionId?: string;
    enrollmentId: string;
    rollNumber?: string;
  };
  effectiveAt: string;
  reason: string;
  note?: string;
  status: "DRAFT" | "UNDER_REVIEW" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  registrationAction: "KEEP" | "REGENERATE";
  financeAssessment?: Record<string, unknown>;
  warning?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  history: Array<{ status: CampusTransfer["status"]; at: string; actorId: string; note?: string }>;
}
const campusTransferFields =
  "id studentId studentName clientRequestId registrationNumber targetRegistrationNumber source{campusId academicYearId programId classId sectionId enrollmentId rollNumber} target{campusId academicYearId programId classId sectionId enrollmentId rollNumber} effectiveAt reason note status registrationAction financeAssessment warning failureReason createdAt updatedAt completedAt history{status at actorId note}";
export async function listCampusTransfers(studentId: string) {
  return (
    await graphqlClient<{ campusTransfers: CampusTransfer[] }, { studentId: string }>(
      `query CampusTransfers($studentId:ID!){campusTransfers(studentId:$studentId){${campusTransferFields}}}`,
      { studentId },
    )
  ).campusTransfers;
}
export async function createCampusTransfer(input: {
  studentId: string;
  targetCampusId: string;
  academicYearId: string;
  targetClassId: string;
  targetSectionId?: string;
  effectiveAt: string;
  reason: string;
  note?: string;
  clientRequestId: string;
}) {
  return (
    await graphqlClient<{ createCampusTransfer: CampusTransfer }, { input: typeof input }>(
      `mutation CreateCampusTransfer($input:CreateCampusTransferInput!){createCampusTransfer(input:$input){${campusTransferFields}}}`,
      { input },
    )
  ).createCampusTransfer;
}
export async function listCampusTransferPage(filter: {
  search?: string;
  status?: CampusTransfer["status"];
  page: number;
  pageSize: number;
}) {
  return (
    await graphqlClient<
      {
        campusTransferPage: {
          items: CampusTransfer[];
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
      },
      { filter: typeof filter }
    >(
      `query CampusTransferPage($filter:CampusTransferPageFilter){campusTransferPage(filter:$filter){items{${campusTransferFields}} page pageSize total totalPages}}`,
      { filter },
    )
  ).campusTransferPage;
}
export async function approveCampusTransfer(id: string) {
  return (
    await graphqlClient<{ approveCampusTransfer: CampusTransfer }, { id: string }>(
      `mutation ApproveCampusTransfer($id:ID!){approveCampusTransfer(id:$id){${campusTransferFields}}}`,
      { id },
    )
  ).approveCampusTransfer;
}
export async function retryCampusTransfer(id: string) {
  return (
    await graphqlClient<{ retryCampusTransfer: CampusTransfer }, { id: string }>(
      `mutation RetryCampusTransfer($id:ID!){retryCampusTransfer(id:$id){${campusTransferFields}}}`,
      { id },
    )
  ).retryCampusTransfer;
}
export async function cancelCampusTransfer(id: string, reason: string) {
  return (
    await graphqlClient<{ cancelCampusTransfer: CampusTransfer }, { id: string; reason: string }>(
      `mutation CancelCampusTransfer($id:ID!,$reason:String!){cancelCampusTransfer(id:$id,reason:$reason){${campusTransferFields}}}`,
      { id, reason },
    )
  ).cancelCampusTransfer;
}
export interface StudentNumberingBatchResult {
  updated: number;
  skipped: number;
  students: Student[];
}
export async function generateClassRegistrationNumbers(input: {
  campusId: string;
  academicYearId: string;
  classId: string;
  clientRequestId: string;
}) {
  return (
    await graphqlClient<
      { generateClassRegistrationNumbers: StudentNumberingBatchResult },
      { input: typeof input }
    >(
      `mutation GenerateClassRegistrationNumbers($input:ClassRegistrationNumberingInput!){generateClassRegistrationNumbers(input:$input){updated skipped students{${fields}}}}`,
      { input },
    )
  ).generateClassRegistrationNumbers;
}
export async function generateSectionRollNumbers(input: {
  campusId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  regenerate: boolean;
  clientRequestId: string;
}) {
  return (
    await graphqlClient<
      { generateSectionRollNumbers: StudentNumberingBatchResult },
      { input: typeof input }
    >(
      `mutation GenerateSectionRollNumbers($input:SectionRollNumberingInput!){generateSectionRollNumbers(input:$input){updated skipped students{${fields}}}}`,
      { input },
    )
  ).generateSectionRollNumbers;
}
export interface StudentNote {
  id: string;
  studentId: string;
  body: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
const noteFields = "id studentId body createdBy createdAt updatedAt";
export async function listStudentNotes(id: string) {
  return (
    await graphqlClient<{ studentNotes: StudentNote[] }, { id: string }>(
      `query StudentNotes($id:ID!){studentNotes(id:$id){${noteFields}}}`,
      { id },
    )
  ).studentNotes;
}
export async function createStudentNote(id: string, body: string) {
  return (
    await graphqlClient<
      { createStudentNote: StudentNote },
      { id: string; input: { body: string } }
    >(
      `mutation CreateStudentNote($id:ID!,$input:StudentNoteInput!){createStudentNote(id:$id,input:$input){${noteFields}}}`,
      { id, input: { body } },
    )
  ).createStudentNote;
}
export async function updateStudentNote(id: string, body: string) {
  return (
    await graphqlClient<
      { updateStudentNote: StudentNote },
      { id: string; input: { body: string } }
    >(
      `mutation UpdateStudentNote($id:ID!,$input:StudentNoteInput!){updateStudentNote(id:$id,input:$input){${noteFields}}}`,
      { id, input: { body } },
    )
  ).updateStudentNote;
}
