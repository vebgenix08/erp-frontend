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
import { AdminDashboardPage } from "../pages/admin/dashboard-page";
import { PrincipalDashboardPage } from "../pages/principal/dashboard-page";
import { HodDashboardPage } from "../pages/hod/dashboard-page";
import { AccountantDashboardPage } from "../pages/accountant/dashboard-page";
import { AccountantCollectionsPage } from "../pages/accountant/collections-page";
import { AccountantDuesPage } from "../pages/accountant/dues-page";
import { AccountantReceiptsPage } from "../pages/accountant/receipts-page";
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
        </Route>
        <Route element={<TenantLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
        <Route element={<RoleLayout />}>
          <Route path="/principal/dashboard" element={<PrincipalDashboardPage />} />
          <Route path="/hod/dashboard" element={<HodDashboardPage />} />
          <Route path="/accountant/dashboard" element={<AccountantDashboardPage />} />
          <Route path="/accountant/collections" element={<AccountantCollectionsPage />} />
          <Route path="/accountant/dues" element={<AccountantDuesPage />} />
          <Route path="/accountant/receipts" element={<AccountantReceiptsPage />} />
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
