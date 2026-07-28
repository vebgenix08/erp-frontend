import { graphqlClient } from "../../../shared/api/graphql-client";
import type { CreateEnquiryInput, Enquiry, EnquiryStatus } from "../model/enquiry.types";

const fields = "id enquiryNumber campusId academicYearId academicTargetId studentName dateOfBirth gender parentName phone email interestedClass source status notes templateId templateVersion customFields createdAt updatedAt closedAt";

export interface EnquiryFilter {
  campusId?: string;
  academicYearId?: string;
  status?: EnquiryStatus;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface EnquiryPage {
  items: Enquiry[];
  total: number;
  limit: number;
  offset: number;
}

export async function listEnquiries(filter?: EnquiryFilter) {
  return (await graphqlClient<{ enquiries: Enquiry[] }, { filter?: EnquiryFilter }>(
    `query Enquiries($filter: EnquiryFilter){ enquiries(filter:$filter){ ${fields} } }`,
    filter ? { filter } : {},
  )).enquiries;
}

export async function listEnquiryPage(filter?: EnquiryFilter) {
  return (await graphqlClient<{ enquiryPage: EnquiryPage }, { filter?: EnquiryFilter }>(
    `query EnquiryPage($filter: EnquiryFilter){ enquiryPage(filter:$filter){ items { ${fields} } total limit offset } }`,
    filter ? { filter } : {},
  )).enquiryPage;
}
export async function createEnquiry(input:CreateEnquiryInput){const wire={...input,...(input.customFields?{customFields:JSON.stringify(input.customFields)}:{})};return(await graphqlClient<{createEnquiry:Enquiry},{input:typeof wire}>(`mutation CreateEnquiry($input:CreateEnquiryInput!){ createEnquiry(input:$input){ ${fields} } }`,{input:wire})).createEnquiry}
export async function updateEnquiry(id:string,input:Partial<CreateEnquiryInput>&{status?:Exclude<EnquiryStatus,"CLOSED">}){return(await graphqlClient<{updateEnquiry:Enquiry},{id:string;input:typeof input}>(`mutation UpdateEnquiry($id:ID!,$input:UpdateEnquiryInput!){ updateEnquiry(id:$id,input:$input){ ${fields} } }`,{id,input})).updateEnquiry}
export async function closeEnquiry(id:string){return(await graphqlClient<{closeEnquiry:Enquiry},{id:string}>(`mutation CloseEnquiry($id:ID!){ closeEnquiry(id:$id){ ${fields} } }`,{id})).closeEnquiry}
