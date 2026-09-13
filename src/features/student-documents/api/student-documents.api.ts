import { graphqlClient } from "../../../shared/api/graphql-client";
import { getCognitoIdToken } from "../../../shared/auth/cognito-token";
import { env } from "../../../shared/config/env";
import type { StudentDocument, StudentDocumentType } from "../model/student-document.types";
const fields =
  "id documentNumber documentType studentId studentName admissionNumber registrationNumber campusId academicYearId classId sectionId purpose validUntil status issuedBy issuedAt updatedAt revokedAt revokeReason";
export async function listStudentDocuments(filter: {
  campusId?: string;
  academicYearId?: string;
  studentId?: string;
  documentType?: StudentDocumentType;
  status?: "ISSUED" | "REVOKED";
}) {
  return (
    await graphqlClient<{ studentDocuments: StudentDocument[] }, { filter: typeof filter }>(
      `query StudentDocuments($filter:StudentDocumentFilter){studentDocuments(filter:$filter){${fields}}}`,
      { filter },
    )
  ).studentDocuments;
}
export interface StudentDocumentPage {
  items: StudentDocument[];
  summary: { total: number; certificates: number; idCards: number; revoked: number };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export async function listStudentDocumentPage(filter: {
  campusId?: string;
  academicYearId?: string;
  studentId?: string;
  documentType?: StudentDocumentType;
  status?: "ISSUED" | "REVOKED";
  search?: string;
  page: number;
  pageSize: number;
}) {
  return (
    await graphqlClient<{ studentDocumentPage: StudentDocumentPage }, { filter: typeof filter }>(
      `query StudentDocumentPage($filter:StudentDocumentFilter){studentDocumentPage(filter:$filter){items{${fields}} summary{total certificates idCards revoked} page pageSize total totalPages}}`,
      { filter },
    )
  ).studentDocumentPage;
}
export async function issueStudentDocument(input: {
  studentId: string;
  documentType: StudentDocumentType;
  purpose?: string;
  validUntil?: string;
}) {
  return (
    await graphqlClient<{ issueStudentDocument: StudentDocument }, { input: typeof input }>(
      `mutation IssueStudentDocument($input:IssueStudentDocumentInput!){issueStudentDocument(input:$input){${fields}}}`,
      { input },
    )
  ).issueStudentDocument;
}
export async function revokeStudentDocument(id: string, reason: string) {
  return (
    await graphqlClient<{ revokeStudentDocument: StudentDocument }, { id: string; reason: string }>(
      `mutation RevokeStudentDocument($id:ID!,$reason:String!){revokeStudentDocument(id:$id,reason:$reason){${fields}}}`,
      { id, reason },
    )
  ).revokeStudentDocument;
}
export async function downloadStudentDocument(document: StudentDocument) {
  const token = await getCognitoIdToken();
  if (!token) throw new Error("Your session has expired");
  const response = await fetch(
    `${env.apiBaseUrl.replace(/\/$/, "")}/v1/student-documents/${encodeURIComponent(document.id)}/pdf`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error("Document PDF could not be generated");
  const url = URL.createObjectURL(await response.blob()),
    anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${document.documentNumber.replaceAll("/", "-")}.pdf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
