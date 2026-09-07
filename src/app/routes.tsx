import { lazy, Suspense, type ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoutes } from "../features/session/ui/protected-routes";
import { AuthLayout } from "./layouts/auth-layout";
import { PlatformLayout } from "./layouts/platform-layout";
import { RoleLayout } from "./layouts/role-layout";
import { TenantLayout } from "./layouts/tenant-layout";
import { LoginPage } from "../pages/auth/login-page";
import { TeacherWorkspaceLayout } from "../features/teacher-workspace/ui/teacher-workspace-layout";
import { recoverFromAssetLoadFailure } from "../shared/lib/frontend-asset-recovery";

const lazyPage = (loader: () => Promise<Record<string, unknown>>, exportName: string) =>
  lazy(async () => {
    try {
      return { default: (await loader())[exportName] as ComponentType };
    } catch (error) {
      if (recoverFromAssetLoadFailure(error)) {
        return await new Promise<{ default: ComponentType }>(() => undefined);
      }
      throw error;
    }
  });

const SelectTenantPage = lazyPage(
  () => import("../pages/auth/select-tenant-page"),
  "SelectTenantPage",
);
const TenantNotFoundPage = lazyPage(
  () => import("../pages/auth/tenant-not-found-page"),
  "TenantNotFoundPage",
);
const ForgotPasswordPage = lazyPage(
  () => import("../pages/auth/forgot-password-page"),
  "ForgotPasswordPage",
);
const ResetPasswordPage = lazyPage(
  () => import("../pages/auth/reset-password-page"),
  "ResetPasswordPage",
);
const LogoutPage = lazyPage(() => import("../pages/auth/logout-page"), "LogoutPage");
const PlatformDashboardPage = lazyPage(
  () => import("../pages/platform/dashboard-page"),
  "PlatformDashboardPage",
);
const PlatformTenantsPage = lazyPage(
  () => import("../pages/platform/tenants-page"),
  "PlatformTenantsPage",
);
const PlatformTenantNewPage = lazyPage(
  () => import("../pages/platform/tenant-new-page"),
  "PlatformTenantNewPage",
);
const PlatformTenantDetailPage = lazyPage(
  () => import("../pages/platform/tenant-detail-page"),
  "PlatformTenantDetailPage",
);
const PlatformTenantOnboardingPage = lazyPage(
  () => import("../pages/platform/tenant-onboarding-page"),
  "PlatformTenantOnboardingPage",
);
const PlatformAuditLogsPage = lazyPage(
  () => import("../pages/platform/audit-logs-page"),
  "PlatformAuditLogsPage",
);
const PlatformFeaturesPage = lazyPage(
  () => import("../pages/platform/features-page"),
  "PlatformFeaturesPage",
);
const PlatformEntitlementsPage = lazyPage(
  () => import("../pages/platform/entitlements-page"),
  "PlatformEntitlementsPage",
);
const PlatformIntegrationsPage = lazyPage(
  () => import("../pages/platform/integrations-page"),
  "PlatformIntegrationsPage",
);
const PlatformOperationsPage = lazyPage(
  () => import("../pages/platform/operations-page"),
  "PlatformOperationsPage",
);
const AdminDashboardPage = lazyPage(
  () => import("../pages/admin/dashboard-page"),
  "AdminDashboardPage",
);
const AdminProfilePage = lazyPage(() => import("../pages/admin/profile-page"), "AdminProfilePage");
const AdminCampusesPage = lazyPage(
  () => import("../pages/admin/campuses-page"),
  "AdminCampusesPage",
);
const AdminAcademicStructurePage = lazyPage(
  () => import("../pages/admin/academic-structure-page"),
  "AdminAcademicStructurePage",
);
const AdminClassSetupPage = lazyPage(
  () => import("../pages/admin/class-setup-page"),
  "AdminClassSetupPage",
);
const AdminAssessmentSetupPage = lazyPage(
  () => import("../pages/admin/assessment-setup-page"),
  "AdminAssessmentSetupPage",
);
const AdminTemplatesPage = lazyPage(
  () => import("../pages/admin/templates-page"),
  "AdminTemplatesPage",
);
const AdminNumberingPage = lazyPage(
  () => import("../pages/admin/numbering-page"),
  "AdminNumberingPage",
);
const AdminNotificationsPage = lazyPage(
  () => import("../pages/admin/notifications-page"),
  "AdminNotificationsPage",
);
const AdminUsersPage = lazyPage(() => import("../pages/admin/users-page"), "AdminUsersPage");
const AdminRolesPage = lazyPage(() => import("../pages/admin/roles-page"), "AdminRolesPage");
const AdminPermissionsPage = lazyPage(
  () => import("../pages/admin/permissions-page"),
  "AdminPermissionsPage",
);
const AdminStaffPage = lazyPage(() => import("../pages/admin/staff-page"), "AdminStaffPage");
const AdminStaffNewPage = lazyPage(
  () => import("../pages/admin/staff-new-page"),
  "AdminStaffNewPage",
);
const AdminStaffDetailPage = lazyPage(
  () => import("../pages/admin/staff-detail-page"),
  "AdminStaffDetailPage",
);
const AdminFinanceSetupPage = lazyPage(
  () => import("../pages/admin/finance-setup-page"),
  "AdminFinanceSetupPage",
);
const AdminFinanceDashboardPage = lazyPage(
  () => import("../pages/admin/finance-dashboard-page"),
  "AdminFinanceDashboardPage",
);
const AdminFeeHeadsPage = lazyPage(
  () => import("../pages/admin/fee-heads-page"),
  "AdminFeeHeadsPage",
);
const AdminFeeSchedulesPage = lazyPage(
  () => import("../pages/admin/fee-schedules-page"),
  "AdminFeeSchedulesPage",
);
const AdminFeeStructuresPage = lazyPage(
  () => import("../pages/admin/fee-structures-page"),
  "AdminFeeStructuresPage",
);
const AdminFeeMappingsPage = lazyPage(
  () => import("../pages/admin/fee-mappings-page"),
  "AdminFeeMappingsPage",
);
const AdminFinanceCollectionsPage = lazyPage(
  () => import("../pages/admin/finance-collections-page"),
  "AdminFinanceCollectionsPage",
);
const AdminFinanceOutstandingPage = lazyPage(
  () => import("../pages/admin/finance-outstanding-page"),
  "AdminFinanceOutstandingPage",
);
const AdminFinanceReceiptsPage = lazyPage(
  () => import("../pages/admin/finance-receipts-page"),
  "AdminFinanceReceiptsPage",
);
const AdminFinanceReconciliationPage = lazyPage(
  () => import("../pages/admin/finance-reconciliation-page"),
  "AdminFinanceReconciliationPage",
);
const AdminReceiptTemplatePage = lazyPage(
  () => import("../pages/admin/receipt-template-page"),
  "AdminReceiptTemplatePage",
);
const AdminGeneralChargesPage = lazyPage(
  () => import("../pages/admin/general-charges-page"),
  "AdminGeneralChargesPage",
);
const AdminStudentsPage = lazyPage(
  () => import("../pages/admin/students-page"),
  "AdminStudentsPage",
);
const AdminStudentDetailPage = lazyPage(
  () => import("../pages/admin/student-detail-page"),
  "AdminStudentDetailPage",
);
const AdminStudentDocumentsPage = lazyPage(
  () => import("../pages/admin/student-documents-page"),
  "AdminStudentDocumentsPage",
);
const AdminCampusTransfersPage = lazyPage(
  () => import("../pages/admin/campus-transfers-page"),
  "AdminCampusTransfersPage",
);
const AdminAdmissionsEnquiriesPage = lazyPage(
  () => import("../pages/admin/admissions-enquiries-page"),
  "AdminAdmissionsEnquiriesPage",
);
const AdminAdmissionsApplicationsPage = lazyPage(
  () => import("../pages/admin/admissions-applications-page"),
  "AdminAdmissionsApplicationsPage",
);
const AdminAdmissionApplicationDetailPage = lazyPage(
  () => import("../pages/admin/admission-application-detail-page"),
  "AdminAdmissionApplicationDetailPage",
);
const AdminAdmittedStudentsPage = lazyPage(
  () => import("../pages/admin/admitted-students-page"),
  "AdminAdmittedStudentsPage",
);
const AccountantDashboardPage = lazyPage(
  () => import("../pages/accountant/dashboard-page"),
  "AccountantDashboardPage",
);
const AccountantCollectionsPage = lazyPage(
  () => import("../pages/accountant/collections-page"),
  "AccountantCollectionsPage",
);
const AccountantOutstandingPage = lazyPage(
  () => import("../pages/accountant/outstanding-page"),
  "AccountantOutstandingPage",
);
const AccountantReceiptsPage = lazyPage(
  () => import("../pages/accountant/receipts-page"),
  "AccountantReceiptsPage",
);
const AccountantReconciliationPage = lazyPage(
  () => import("../pages/accountant/reconciliation-page"),
  "AccountantReconciliationPage",
);
const AdmissionsEnquiriesPage = lazyPage(
  () => import("../pages/admissions/enquiries-page"),
  "AdmissionsEnquiriesPage",
);
const AdmissionsApplicationsPage = lazyPage(
  () => import("../pages/admissions/applications-page"),
  "AdmissionsApplicationsPage",
);
const TeacherWorkspaceRoutePage = lazyPage(
  () => import("../pages/teacher/workspace-page"),
  "TeacherWorkspaceRoutePage",
);
const NotFoundPage = lazyPage(() => import("../pages/not-found/ui/not-found-page"), "NotFoundPage");

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-medium text-slate-600">
          Loading workspace...
        </div>
      }
    >
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
          <Route element={<ProtectedRoutes allowedRoles={["SUPER_ADMIN"]} />}>
            <Route element={<PlatformLayout />}>
              <Route path="/platform/dashboard" element={<PlatformDashboardPage />} />
              <Route path="/platform/tenants" element={<PlatformTenantsPage />} />
              <Route path="/platform/tenants/new" element={<PlatformTenantNewPage />} />
              <Route path="/platform/tenants/:tenantId" element={<PlatformTenantDetailPage />} />
              <Route
                path="/platform/tenants/:tenantId/onboarding"
                element={<PlatformTenantOnboardingPage />}
              />
              <Route path="/platform/audit-logs" element={<PlatformAuditLogsPage />} />
              <Route path="/platform/features" element={<PlatformFeaturesPage />} />
              <Route path="/platform/entitlements" element={<PlatformEntitlementsPage />} />
              <Route path="/platform/integrations" element={<PlatformIntegrationsPage />} />
              <Route path="/platform/operations" element={<PlatformOperationsPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoutes allowedRoles={["TENANT_ADMIN", "ADMIN"]} />}>
            <Route element={<TenantLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/profile" element={<AdminProfilePage />} />
              <Route
                path="/admin/setup/institution"
                element={<Navigate to="/admin/profile" replace />}
              />
              <Route path="/admin/setup/campuses" element={<AdminCampusesPage />} />
              <Route
                path="/admin/setup/academic-structure"
                element={<AdminAcademicStructurePage />}
              />
              <Route path="/admin/academics/class-setup" element={<AdminClassSetupPage />} />
              <Route path="/admin/academics/assessments" element={<AdminAssessmentSetupPage />} />
              <Route path="/admin/setup/templates" element={<AdminTemplatesPage />} />
              <Route path="/admin/setup/numbering" element={<AdminNumberingPage />} />
              <Route path="/admin/setup/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/access/users" element={<AdminUsersPage />} />
              <Route path="/admin/access/roles" element={<AdminRolesPage />} />
              <Route path="/admin/access/permissions" element={<AdminPermissionsPage />} />
              <Route path="/admin/access" element={<Navigate to="/admin/access/users" replace />} />
              <Route path="/admin/finance/setup" element={<AdminFinanceSetupPage />} />
              <Route path="/admin/finance/dashboard" element={<AdminFinanceDashboardPage />} />
              <Route
                path="/admin/finance"
                element={<Navigate to="/admin/finance/dashboard" replace />}
              />
              <Route path="/admin/finance/fee-heads" element={<AdminFeeHeadsPage />} />
              <Route path="/admin/finance/fee-schedules" element={<AdminFeeSchedulesPage />} />
              <Route path="/admin/finance/fee-structures" element={<AdminFeeStructuresPage />} />
              <Route path="/admin/finance/assignments" element={<AdminFeeMappingsPage />} />
              <Route path="/admin/finance/collections" element={<AdminFinanceCollectionsPage />} />
              <Route path="/admin/finance/outstanding" element={<AdminFinanceOutstandingPage />} />
              <Route path="/admin/finance/receipts" element={<AdminFinanceReceiptsPage />} />
              <Route
                path="/admin/finance/receipt-template"
                element={<AdminReceiptTemplatePage />}
              />
              <Route path="/admin/finance/general-charges" element={<AdminGeneralChargesPage />} />
              <Route
                path="/admin/finance/reconciliation"
                element={<AdminFinanceReconciliationPage />}
              />
              <Route path="/admin/students" element={<AdminStudentsPage />} />
              <Route path="/admin/students/:studentId" element={<AdminStudentDetailPage />} />
              <Route path="/admin/student-documents" element={<AdminStudentDocumentsPage />} />
              <Route path="/admin/campus-transfers" element={<AdminCampusTransfersPage />} />
              <Route path="/admin/staff" element={<AdminStaffPage />} />
              <Route path="/admin/staff/new" element={<AdminStaffNewPage />} />
              <Route path="/admin/staff/:employeeId" element={<AdminStaffDetailPage />} />
              <Route
                path="/admin/admissions/enquiries"
                element={<AdminAdmissionsEnquiriesPage />}
              />
              <Route
                path="/admin/admissions/applications"
                element={<AdminAdmissionsApplicationsPage />}
              />
              <Route
                path="/admin/admissions/applications/:applicationId"
                element={<AdminAdmissionApplicationDetailPage />}
              />
              <Route
                path="/admin/admissions/admitted-students"
                element={<AdminAdmittedStudentsPage />}
              />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>
          <Route element={<TeacherWorkspaceLayout />}>
            <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/:pageSlug" element={<TeacherWorkspaceRoutePage />} />
          </Route>
          <Route element={<RoleLayout />}>
            <Route path="/accountant/dashboard" element={<AccountantDashboardPage />} />
            <Route path="/accountant/collections" element={<AccountantCollectionsPage />} />
            <Route path="/accountant/outstanding" element={<AccountantOutstandingPage />} />
            <Route path="/accountant/receipts" element={<AccountantReceiptsPage />} />
            <Route path="/accountant/reconciliation" element={<AccountantReconciliationPage />} />
            <Route
              path="/admissions/dashboard"
              element={<Navigate to="/admissions/enquiries" replace />}
            />
            <Route path="/admissions/enquiries" element={<AdmissionsEnquiriesPage />} />
            <Route path="/admissions/applications" element={<AdmissionsApplicationsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
