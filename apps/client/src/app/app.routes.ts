import { Route } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { LoginComponent } from './core/auth/login.component';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { authGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
    { path: 'login', component: LoginComponent },
    { path: 'forgot-password', loadComponent: () => import('./core/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
    { path: 'reset-password', loadComponent: () => import('./core/auth/reset-password.component').then(m => m.ResetPasswordComponent) },
    { path: 'change-password', loadComponent: () => import('./core/auth/change-password.component').then(m => m.ChangePasswordComponent) },
    {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', component: DashboardComponent },
            { path: 'users', loadComponent: () => import('./features/admin/users/user-list').then(m => m.UserListComponent) },
            { path: 'teams', loadComponent: () => import('./features/admin/teams/team-manager').then(m => m.TeamManagerComponent) },
            { path: 'questions', loadComponent: () => import('./features/admin/questions/question-list/question-list').then(m => m.QuestionListComponent) },
            { path: 'exams', loadComponent: () => import('./features/admin/exams/exam-list/exam-list.component').then(m => m.ExamListComponent) },
            { path: 'exams/:id/builder', loadComponent: () => import('./features/admin/exams/exam-builder/exam-builder.component').then(m => m.ExamBuilderComponent) },
            { path: 'exams/:id/results', loadComponent: () => import('./features/admin/exams/exam-results/exam-results.component').then(m => m.ExamResultsComponent) },
            { path: 'exams/results/:attemptId', loadComponent: () => import('./features/admin/exams/exam-results/result-detail/result-detail.component').then(m => m.ResultDetailComponent) },
            { path: 'activity', loadComponent: () => import('./features/admin/activity/activity-list').then(m => m.ActivityListComponent) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ]
    },
    {
        path: 'student',
        loadComponent: () => import('./layout/student-layout/student-layout.component').then(m => m.StudentLayoutComponent),
        canActivate: [authGuard], // Reusing AuthGuard for now, technically checks for token
        children: [
            { path: 'overview', loadComponent: () => import('./features/student/overview/student-overview.component').then(m => m.StudentOverviewComponent) },
            { path: 'dashboard', loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent) },
            { path: 'results', loadComponent: () => import('./features/student/result-list/result-list.component').then(m => m.StudentResultsListComponent) },
            { path: 'reports', loadComponent: () => import('./features/student/reports/student-reports.component').then(m => m.StudentReportsComponent) },
            { path: 'profile', loadComponent: () => import('./features/student/profile/student-profile.component').then(m => m.StudentProfileComponent) },
            { path: 'exam/:id/start', loadComponent: () => import('./features/student/exam-runner/exam-runner.component').then(m => m.ExamRunnerComponent) },
            { path: 'exam/:attemptId/result', loadComponent: () => import('./features/student/exam-result/exam-result.component').then(m => m.StudentExamResultComponent) },
            { path: 'parent-report', loadComponent: () => import('./features/student/parent-report/parent-report.component').then(m => m.ParentReportComponent) },
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
        ]
    },
    { path: '', redirectTo: 'admin', pathMatch: 'full' },
];
