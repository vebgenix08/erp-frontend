import { graphqlClient } from "../../../shared/api/graphql-client";
import type { CreateEmployeeInput, Employee, EmployeeInviteAttempt, EmployeeInviteDeliveryEvent, EmployeeLoginStatus, EmployeePage, EmployeeStatus, StaffCategory, UpdateEmployeeInput } from "../model/staff.types";

const fields = "id employeeCode fullName email phone staffCategory staffType employmentType designation department primaryCampusId campusIds joiningDate status loginStatus inviteAttempts inviteError lastInviteAttemptAt invitedAt externalHrCode profilePhotoFileId templateId templateVersion customFields createdAt updatedAt endedAt endReason";

export interface EmployeeFilter { search?: string; status?: EmployeeStatus; staffCategory?: StaffCategory; campusId?: string; loginStatus?: EmployeeLoginStatus; page?:number;pageSize?:number;sortBy?:EmployeePage["sortBy"];sortDirection?:EmployeePage["sortDirection"]; }
function normalizeEmployee(value: Employee): Employee {
  if (typeof value.customFields !== "string") return value;
  try {
    return { ...value, customFields: JSON.parse(value.customFields) as Record<string, unknown> };
  } catch {
    return { ...value, customFields: {} };
  }
}
export async function listEmployees(filter?: EmployeeFilter) {
  const response = await graphqlClient<{ employees: Employee[] }, { filter?: EmployeeFilter }>(
    `query Employees($filter: EmployeeFilter) { employees(filter: $filter) { ${fields} } }`,
    filter ? { filter } : {},
  );
  return response.employees.map(normalizeEmployee);
}
export async function listEmployeePage(filter: EmployeeFilter) {
  const response = await graphqlClient<{ employeePage: EmployeePage }, { filter: EmployeeFilter }>(
    `query EmployeePage($filter: EmployeeFilter) { employeePage(filter: $filter) { items { ${fields} } page pageSize total totalPages sortBy sortDirection summary { total active teaching nonTeaching loginReady inviteIssues } } }`,
    { filter },
  );
  return { ...response.employeePage, items: response.employeePage.items.map(normalizeEmployee) };
}
export async function getEmployee(id: string) { return normalizeEmployee((await graphqlClient<{ employee: Employee }, { id: string }>(`query Employee($id: ID!) { employee(id: $id) { ${fields} } }`, { id })).employee); }
export async function listEmployeeInviteAttempts(id:string){return(await graphqlClient<{employeeInviteAttempts:EmployeeInviteAttempt[]},{id:string}>(`query EmployeeInviteAttempts($id:ID!){ employeeInviteAttempts(id:$id){ id employeeId email attemptNumber status provider error createdAt } }`,{id})).employeeInviteAttempts}
export async function listEmployeeInviteDeliveryEvents(id:string){return(await graphqlClient<{employeeInviteDeliveryEvents:EmployeeInviteDeliveryEvent[]},{id:string}>(`query EmployeeInviteDeliveryEvents($id:ID!){employeeInviteDeliveryEvents(id:$id){id messageId eventType occurredAt recipients}}`,{id})).employeeInviteDeliveryEvents}
export async function createEmployee(input: CreateEmployeeInput) { const wire={...input,...(input.customFields?{customFields:JSON.stringify(input.customFields)}:{})};return normalizeEmployee((await graphqlClient<{ createEmployee: Employee }, { input: typeof wire }>(`mutation CreateEmployee($input: CreateEmployeeInput!) { createEmployee(input: $input) { ${fields} } }`, { input:wire })).createEmployee); }
export async function updateEmployee(id: string, input: UpdateEmployeeInput) { const wire={...input,...(input.customFields?{customFields:JSON.stringify(input.customFields)}:{})};return normalizeEmployee((await graphqlClient<{ updateEmployee: Employee }, { id: string; input: typeof wire }>(`mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) { updateEmployee(id: $id, input: $input) { ${fields} } }`, { id, input:wire })).updateEmployee); }
export async function resendEmployeeInvite(id: string) { return normalizeEmployee((await graphqlClient<{ resendEmployeeInvite: Employee }, { id: string }>(`mutation ResendEmployeeInvite($id: ID!) { resendEmployeeInvite(id: $id) { ${fields} } }`, { id })).resendEmployeeInvite); }
export async function endEmployment(id: string, reason: string) { return normalizeEmployee((await graphqlClient<{ endEmployment: Employee }, { id: string; reason: string }>(`mutation EndEmployment($id: ID!, $reason: String!) { endEmployment(id: $id, reason: $reason) { ${fields} } }`, { id, reason })).endEmployment); }
export async function deactivateEmployee(id:string){return normalizeEmployee((await graphqlClient<{deactivateEmployee:Employee},{id:string}>(`mutation DeactivateEmployee($id:ID!){deactivateEmployee(id:$id){${fields}}}`,{id})).deactivateEmployee)}
export async function reactivateEmployee(id:string){return normalizeEmployee((await graphqlClient<{reactivateEmployee:Employee},{id:string}>(`mutation ReactivateEmployee($id:ID!){reactivateEmployee(id:$id){${fields}}}`,{id})).reactivateEmployee)}
