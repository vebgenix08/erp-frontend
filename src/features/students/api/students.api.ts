import { graphqlClient } from "../../../shared/api/graphql-client";
import type { Student } from "../model/student.types";

const fields = "id admissionApplicationId admissionNumber registrationNumber name dateOfBirth gender phone email address status createdAt updatedAt guardian { name phone relation } enrollment { id campusId academicYearId programId classId sectionId rollNumber status enrolledAt }";
export async function listStudents(filter: { campusId?:string;academicYearId?:string;classId?:string;sectionId?:string;status?:Student["status"];search?:string;limit?:number;offset?:number }) {
  return (await graphqlClient<{students:Student[]},{filter:typeof filter}>(`query Students($filter: StudentFilter) { students(filter:$filter) { ${fields} } }`,{filter})).students;
}
export interface StudentPage {
  items: Student[];
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
      `query StudentPage($filter: StudentFilter) { studentPage(filter:$filter) { items { ${fields} } page pageSize total totalPages sortBy sortDirection } }`,
      { filter },
    )
  ).studentPage;
}
export async function getStudent(id:string) {
  return (await graphqlClient<{student:Student},{id:string}>(`query Student($id: ID!) { student(id:$id) { ${fields} } }`,{id})).student;
}
export async function getStudentByAdmissionApplicationId(id:string) {
  return (await graphqlClient<{studentByAdmissionApplicationId:Student},{id:string}>(`query StudentByAdmissionApplicationId($id: ID!) { studentByAdmissionApplicationId(id:$id) { ${fields} } }`,{id})).studentByAdmissionApplicationId;
}
export async function changeStudentEnrollment(id:string,input:{campusId:string;academicYearId:string;classId:string;sectionId?:string;rollNumber?:string;reason:string}) {
  return (await graphqlClient<{changeStudentEnrollment:Student},{id:string;input:typeof input}>(`mutation ChangeStudentEnrollment($id: ID!, $input: ChangeStudentEnrollmentInput!) { changeStudentEnrollment(id:$id,input:$input) { ${fields} } }`,{id,input})).changeStudentEnrollment;
}
export interface StudentNote { id:string;studentId:string;body:string;createdBy:string;createdAt:string;updatedAt:string }
const noteFields="id studentId body createdBy createdAt updatedAt";
export async function listStudentNotes(id:string){return(await graphqlClient<{studentNotes:StudentNote[]},{id:string}>(`query StudentNotes($id:ID!){studentNotes(id:$id){${noteFields}}}`,{id})).studentNotes}
export async function createStudentNote(id:string,body:string){return(await graphqlClient<{createStudentNote:StudentNote},{id:string;input:{body:string}}>(`mutation CreateStudentNote($id:ID!,$input:StudentNoteInput!){createStudentNote(id:$id,input:$input){${noteFields}}}`,{id,input:{body}})).createStudentNote}
export async function updateStudentNote(id:string,body:string){return(await graphqlClient<{updateStudentNote:StudentNote},{id:string;input:{body:string}}>(`mutation UpdateStudentNote($id:ID!,$input:StudentNoteInput!){updateStudentNote(id:$id,input:$input){${noteFields}}}`,{id,input:{body}})).updateStudentNote}
