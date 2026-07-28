import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoutes } from "../features/session/ui/protected-routes";
import { AuthLayout } from "./layouts/auth-layout";
import { PlatformLayout } from "./layouts/platform-layout";
import { RoleLayout } from "./layouts/role-layout";
import { TenantLayout } from "./layouts/tenant-layout";
import { LoginPage } from "../pages/auth/login-page";
import { SelectTenantPage } from "../pages/auth/select-tenant-page";
import { TenantNotFoundPage } from "../pages/auth/tenant-not-found-page";
import { ForgotPasswordPage } from "../pages/auth/forgot-password-page";
import { ResetPasswordPage } from "../pages/auth/reset-password-page";
import { LogoutPage } from "../pages/auth/logout-page";
import { PlatformDashboardPage } from "../pages/platform/dashboard-page";
import { PlatformTenantsPage } from "../pages/platform/tenants-page";
import { PlatformTenantNewPage } from "../pages/platform/tenant-new-page";
import { PlatformTenantDetailPage } from "../pages/platform/tenant-detail-page";
import { PlatformTenantOnboardingPage } from "../pages/platform/tenant-onboarding-page";
import { PlatformAuditLogsPage } from "../pages/platform/audit-logs-page";
import { PlatformFeaturesPage } from "../pages/platform/features-page";
import { PlatformEntitlementsPage } from "../pages/platform/entitlements-page";
import { PlatformIntegrationsPage } from "../pages/platform/integrations-page";
import { PlatformOperationsPage } from "../pages/platform/operations-page";
import { AdminDashboardPage } from "../pages/admin/dashboard-page";
import { AdminProfilePage } from "../pages/admin/profile-page";
import { AdminCampusesPage } from "../pages/admin/campuses-page";
import { AdminAcademicYearsPage } from "../pages/admin/academic-years-page";
import { AdminAcademicStructurePage } from "../pages/admin/academic-structure-page";
import { AdminTeachingAssignmentsPage } from "../pages/admin/teaching-assignments-page";
import { AdminSetupReadinessPage } from "../pages/admin/setup-readiness-page";
import { AdminTemplatesPage } from "../pages/admin/templates-page";
import { AdminNumberingPage } from "../pages/admin/numbering-page";
import { AdminNotificationsPage } from "../pages/admin/notifications-page";
import { AdminUsersPage } from "../pages/admin/users-page";
import { AdminRolesPage } from "../pages/admin/roles-page";
import { AdminPermissionsPage } from "../pages/admin/permissions-page";
import { AdminStaffPage } from "../pages/admin/staff-page";
import { AdminStaffNewPage } from "../pages/admin/staff-new-page";
import { AdminStaffDetailPage } from "../pages/admin/staff-detail-page";
import { AdminFinanceSetupPage } from "../pages/admin/finance-setup-page";
import { AdminFinanceDashboardPage } from "../pages/admin/finance-dashboard-page";
import { AdminFeeHeadsPage } from "../pages/admin/fee-heads-page";
import { AdminFeeSchedulesPage } from "../pages/admin/fee-schedules-page";
import { AdminFeeStructuresPage } from "../pages/admin/fee-structures-page";
import { AdminFeeMappingsPage } from "../pages/admin/fee-mappings-page";
import { AdminFinanceCollectionsPage } from "../pages/admin/finance-collections-page";
import { AdminFinanceOutstandingPage } from "../pages/admin/finance-outstanding-page";
import { AdminFinanceReceiptsPage } from "../pages/admin/finance-receipts-page";
import { AdminFinanceReconciliationPage } from "../pages/admin/finance-reconciliation-page";
import { AdminReceiptTemplatePage } from "../pages/admin/receipt-template-page";
import { AdminGeneralChargesPage } from "../pages/admin/general-charges-page";
import { AdminStudentsPage } from "../pages/admin/students-page";
import { AdminStudentDetailPage } from "../pages/admin/student-detail-page";
import { AdminStudentDocumentsPage } from "../pages/admin/student-documents-page";
import { AdminAdmissionsEnquiriesPage } from "../pages/admin/admissions-enquiries-page";
import { AdminAdmissionsApplicationsPage } from "../pages/admin/admissions-applications-page";
import { AdminAdmissionApplicationDetailPage } from "../pages/admin/admission-application-detail-page";
import { AdminAdmittedStudentsPage } from "../pages/admin/admitted-students-page";
import { PrincipalDashboardPage } from "../pages/principal/dashboard-page";
import { HodDashboardPage } from "../pages/hod/dashboard-page";
import { AccountantDashboardPage } from "../pages/accountant/dashboard-page";
import { AccountantCollectionsPage } from "../pages/accountant/collections-page";
import { AccountantOutstandingPage } from "../pages/accountant/outstanding-page";
import { AccountantReceiptsPage } from "../pages/accountant/receipts-page";
import { AccountantReconciliationPage } from "../pages/accountant/reconciliation-page";
import { AdmissionsDashboardPage } from "../pages/admissions/dashboard-page";
import { AdmissionsEnquiriesPage } from "../pages/admissions/enquiries-page";
import { AdmissionsApplicationsPage } from "../pages/admissions/applications-page";
import { TeacherDashboardPage } from "../pages/teacher/dashboard-page";
import { ClassTeacherDashboardPage } from "../pages/class-teacher/dashboard-page";
import { StudentDashboardPage } from "../pages/student/dashboard-page";
import { ParentDashboardPage } from "../pages/parent/dashboard-page";
import { LibraryDashboardPage } from "../pages/library/dashboard-page";
import { TransportDashboardPage } from "../pages/transport/dashboard-page";
import { HostelDashboardPage } from "../pages/hostel/dashboard-page";
import { ExamsDashboardPage } from "../pages/exams/dashboard-page";
import { HrDashboardPage } from "../pages/hr/dashboard-page";
import { NotFoundPage } from "../pages/not-found/ui/not-found-page";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-tenant" element={<SelectTenantPage />} />
        <Route path="/tenant-not-found" element={<TenantNotFoundPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/logout" element={<LogoutPage />} />
      </Route>
      <Route element={<ProtectedRoutes />}>
        <Route element={<PlatformLayout />}>
          <Route path="/platform/dashboard" element={<PlatformDashboardPage />} />
          <Route path="/platform/tenants" element={<PlatformTenantsPage />} />
          <Route path="/platform/tenants/new" element={<PlatformTenantNewPage />} />
          <Route path="/platform/tenants/:tenantId" element={<PlatformTenantDetailPage />} />
          <Route path="/platform/tenants/:tenantId/onboarding" element={<PlatformTenantOnboardingPage />} />
          <Route path="/platform/audit-logs" element={<PlatformAuditLogsPage />} />
          <Route path="/platform/features" element={<PlatformFeaturesPage />} />
          <Route path="/platform/entitlements" element={<PlatformEntitlementsPage />} />
          <Route path="/platform/integrations" element={<PlatformIntegrationsPage />} />
          <Route path="/platform/operations" element={<PlatformOperationsPage />} />
        </Route>
        <Route element={<TenantLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
          <Route path="/admin/setup/institution" element={<Navigate to="/admin/profile" replace />} />
          <Route path="/admin/setup/campuses" element={<AdminCampusesPage />} />
          <Route path="/admin/setup/academic-years" element={<AdminAcademicYearsPage />} />
          <Route path="/admin/setup/academic-structure" element={<AdminAcademicStructurePage />} />
          <Route path="/admin/academics/teaching-assignments" element={<AdminTeachingAssignmentsPage />} />
          <Route path="/admin/setup/readiness" element={<AdminSetupReadinessPage />} />
          <Route path="/admin/setup/templates" element={<AdminTemplatesPage />} />
          <Route path="/admin/setup/numbering" element={<AdminNumberingPage />} />
          <Route path="/admin/setup/notifications" element={<AdminNotificationsPage />} />
          <Route path="/admin/access/users" element={<AdminUsersPage />} />
          <Route path="/admin/access/roles" element={<AdminRolesPage />} />
          <Route path="/admin/access/permissions" element={<AdminPermissionsPage />} />
          <Route path="/admin/access" element={<Navigate to="/admin/access/users" replace />} />
          <Route path="/admin/finance/setup" element={<AdminFinanceSetupPage />} />
          <Route path="/admin/finance/dashboard" element={<AdminFinanceDashboardPage />} />
          <Route path="/admin/finance" element={<Navigate to="/admin/finance/dashboard" replace />} />
          <Route path="/admin/finance/fee-heads" element={<AdminFeeHeadsPage />} />
          <Route path="/admin/finance/fee-schedules" element={<AdminFeeSchedulesPage />} />
          <Route path="/admin/finance/fee-structures" element={<AdminFeeStructuresPage />} />
          <Route path="/admin/finance/assignments" element={<AdminFeeMappingsPage />} />
          <Route path="/admin/finance/collections" element={<AdminFinanceCollectionsPage />} />
          <Route path="/admin/finance/outstanding" element={<AdminFinanceOutstandingPage />} />
          <Route path="/admin/finance/receipts" element={<AdminFinanceReceiptsPage />} />
          <Route path="/admin/finance/receipt-template" element={<AdminReceiptTemplatePage />} />
          <Route path="/admin/finance/general-charges" element={<AdminGeneralChargesPage />} />
          <Route path="/admin/finance/reconciliation" element={<AdminFinanceReconciliationPage />} />
          <Route path="/admin/students" element={<AdminStudentsPage />} />
          <Route path="/admin/students/:studentId" element={<AdminStudentDetailPage />} />
          <Route path="/admin/student-documents" element={<AdminStudentDocumentsPage />} />
          <Route path="/admin/staff" element={<AdminStaffPage />} />
          <Route path="/admin/staff/new" element={<AdminStaffNewPage />} />
          <Route path="/admin/staff/:employeeId" element={<AdminStaffDetailPage />} />
          <Route path="/admin/admissions/enquiries" element={<AdminAdmissionsEnquiriesPage />} />
          <Route path="/admin/admissions/applications" element={<AdminAdmissionsApplicationsPage />} />
          <Route path="/admin/admissions/applications/:applicationId" element={<AdminAdmissionApplicationDetailPage />} />
          <Route path="/admin/admissions/admitted-students" element={<AdminAdmittedStudentsPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
        <Route element={<RoleLayout />}>
          <Route path="/principal/dashboard" element={<PrincipalDashboardPage />} />
          <Route path="/hod/dashboard" element={<HodDashboardPage />} />
          <Route path="/accountant/dashboard" element={<AccountantDashboardPage />} />
          <Route path="/accountant/collections" element={<AccountantCollectionsPage />} />
          <Route path="/accountant/outstanding" element={<AccountantOutstandingPage />} />
          <Route path="/accountant/receipts" element={<AccountantReceiptsPage />} />
          <Route path="/accountant/reconciliation" element={<AccountantReconciliationPage />} />
          <Route path="/admissions/dashboard" element={<AdmissionsDashboardPage />} />
          <Route path="/admissions/enquiries" element={<AdmissionsEnquiriesPage />} />
          <Route path="/admissions/applications" element={<AdmissionsApplicationsPage />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="/class-teacher/dashboard" element={<ClassTeacherDashboardPage />} />
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
          <Route path="/library/dashboard" element={<LibraryDashboardPage />} />
          <Route path="/transport/dashboard" element={<TransportDashboardPage />} />
          <Route path="/hostel/dashboard" element={<HostelDashboardPage />} />
          <Route path="/exams/dashboard" element={<ExamsDashboardPage />} />
          <Route path="/hr/dashboard" element={<HrDashboardPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
