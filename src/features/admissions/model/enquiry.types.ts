export type EnquiryStatus = "NEW" | "CONTACTED" | "FOLLOW_UP" | "CONVERTED" | "CLOSED";
export interface Enquiry {
  id: string;
  enquiryNumber: string;
  campusId?: string;
  academicYearId?: string;
  academicTargetId?: string;
  studentName: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  parentName: string;
  phone: string;
  email?: string;
  interestedClass?: string;
  source?: string;
  status: EnquiryStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}
export interface CreateEnquiryInput {
  campusId?: string;
  academicYearId?: string;
  academicTargetId?: string;
  studentName: string;
  parentName: string;
  phone: string;
  email?: string;
  interestedClass?: string;
  source?: string;
  notes?: string;
  templateId: string;
  templateVersion: number;
  customFields?: Record<string, unknown>;
}
