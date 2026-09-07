export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CONFIRMED"
  | "CANCELLED";
export interface ApplicationDocumentReference {
  fileId: string;
  documentType: string;
  fileName: string;
}
export interface ApplicationReview {
  decision: "APPROVED" | "REJECTED";
  reviewedBy: string;
  reviewedAt: string;
  remarks?: string;
}
export interface ApplicationStageEntry {
  status: ApplicationStatus;
  at: string;
  actorId: string;
  remarks?: string;
}
export interface AdmissionApplication {
  id: string;
  applicationNumber?: string;
  admissionNumber?: string;
  enquiryId?: string;
  campusId: string;
  academicYearId: string;
  academicTargetId: string;
  sectionId?: string;
  status: ApplicationStatus;
  studentName: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  email?: string;
  address?: string;
  parentName: string;
  parentPhone?: string;
  parentRelation?: string;
  templateId: string;
  templateVersion: number;
  customFields?: Record<string, unknown>;
  documents: ApplicationDocumentReference[];
  reviews: ApplicationReview[];
  stageHistory: ApplicationStageEntry[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}
export type ApplicationDuplicateReason = "PHONE" | "EMAIL" | "NAME_AND_DATE_OF_BIRTH";
export interface ApplicationDuplicateMatch {
  applicationId: string;
  applicationNumber?: string;
  admissionNumber?: string;
  studentName: string;
  status: ApplicationStatus;
  reasons: ApplicationDuplicateReason[];
}
export interface ApplicationDuplicateCheck {
  applicationId: string;
  hasPotentialDuplicates: boolean;
  matches: ApplicationDuplicateMatch[];
  checkedAt: string;
}
export interface CreateApplicationInput {
  enquiryId?: string;
  campusId: string;
  academicYearId: string;
  academicTargetId: string;
  sectionId?: string;
  studentName: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  email?: string;
  address?: string;
  parentName: string;
  parentPhone?: string;
  parentRelation?: string;
  templateId: string;
  templateVersion: number;
  customFields?: Record<string, unknown>;
  documents?: ApplicationDocumentReference[];
}
