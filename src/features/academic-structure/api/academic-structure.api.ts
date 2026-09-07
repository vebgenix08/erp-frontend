import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  AcademicClass,
  ClassInput,
  Program,
  ProgramInput,
  Section,
  SectionInput,
  Subject,
  SubjectInput,
} from "../model/academic-structure.types";
const programFields = "id campusId academicUnitId code name description status";
const classFields = "id campusId programId code name description status";
const sectionFields = "id campusId programId classId code name description status";
const subjectFields = "id campusId programId classId code name subjectType credits status";
const filterQuery = (campusId: string) => ({ filter: { campusId } });
export async function listPrograms(campusId: string, academicUnitId?: string) {
  const filter = { campusId, ...(academicUnitId ? { academicUnitId } : {}) };
  return (
    await graphqlClient<{ academicPrograms: Program[] }, { filter: typeof filter }>(
      `query AcademicPrograms($filter: AcademicProgramFilter) { academicPrograms(filter: $filter) { ${programFields} } }`,
      { filter },
    )
  ).academicPrograms;
}
export async function listClasses(campusId: string) {
  return (
    await graphqlClient<{ academicClasses: AcademicClass[] }, { filter: { campusId: string } }>(
      `query AcademicClasses($filter: AcademicClassFilter) { academicClasses(filter: $filter) { ${classFields} } }`,
      filterQuery(campusId),
    )
  ).academicClasses;
}
export async function listSections(campusId: string) {
  return (
    await graphqlClient<{ academicSections: Section[] }, { filter: { campusId: string } }>(
      `query AcademicSections($filter: AcademicSectionFilter) { academicSections(filter: $filter) { ${sectionFields} } }`,
      filterQuery(campusId),
    )
  ).academicSections;
}
export async function listSubjects(campusId: string) {
  return (
    await graphqlClient<{ academicSubjects: Subject[] }, { filter: { campusId: string } }>(
      `query AcademicSubjects($filter: AcademicSubjectFilter) { academicSubjects(filter: $filter) { ${subjectFields} } }`,
      filterQuery(campusId),
    )
  ).academicSubjects;
}
export async function createProgram(input: ProgramInput) {
  return (
    await graphqlClient<{ createAcademicProgram: Program }, { input: ProgramInput }>(
      `mutation CreateAcademicProgram($input: CreateAcademicProgramInput!) { createAcademicProgram(input: $input) { ${programFields} } }`,
      { input },
    )
  ).createAcademicProgram;
}
export async function createClass(input: ClassInput) {
  return (
    await graphqlClient<{ createAcademicClass: AcademicClass }, { input: ClassInput }>(
      `mutation CreateAcademicClass($input: CreateAcademicClassInput!) { createAcademicClass(input: $input) { ${classFields} } }`,
      { input },
    )
  ).createAcademicClass;
}
export async function createSection(input: SectionInput) {
  return (
    await graphqlClient<{ createAcademicSection: Section }, { input: SectionInput }>(
      `mutation CreateAcademicSection($input: CreateAcademicSectionInput!) { createAcademicSection(input: $input) { ${sectionFields} } }`,
      { input },
    )
  ).createAcademicSection;
}
export async function createSubject(input: SubjectInput) {
  return (
    await graphqlClient<{ createAcademicSubject: Subject }, { input: SubjectInput }>(
      `mutation CreateAcademicSubject($input: CreateAcademicSubjectInput!) { createAcademicSubject(input: $input) { ${subjectFields} } }`,
      { input },
    )
  ).createAcademicSubject;
}
