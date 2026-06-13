"""API URL routes for Fund My Startup."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('health/', views.HealthCheckView.as_view(), name='api-health'),
    # Public auth & registration
    path('auth/login/', views.LoginView.as_view(), name='api-login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='api-token-refresh'),
    path('auth/forgot-password/', views.ForgotPasswordView.as_view(), name='api-forgot-password'),
    path('auth/reset-password/', views.ResetPasswordView.as_view(), name='api-reset-password'),
    path('auth/verify-email/', views.VerifyEmailView.as_view(), name='api-verify-email'),
    path('auth/login-2fa/', views.Login2FAView.as_view(), name='api-login-2fa'),
    path('auth/2fa/setup/', views.Setup2FAView.as_view(), name='api-2fa-setup'),
    path('auth/2fa/verify/', views.Verify2FAEnableView.as_view(), name='api-2fa-verify'),
    path('auth/2fa/disable/', views.Disable2FAView.as_view(), name='api-2fa-disable'),
    path('register/startup/', views.StartupRegisterView.as_view(), name='api-register-startup'),

    path('register/investor/', views.InvestorRegisterView.as_view(), name='api-register-investor'),
    path('contact/', views.ContactMessageView.as_view(), name='api-contact'),

    # Public listings
    path('categories/', views.StartupCategoryListView.as_view(), name='api-categories'),
    path('startups/', views.ApprovedStartupListView.as_view(), name='api-startups'),
    path('investors/', views.ApprovedInvestorListView.as_view(), name='api-investors'),
    path('startups/<int:startup_id>/', views.StartupDetailView.as_view(), name='api-startup-detail'),
    path('documents/upload/', views.DocumentUploadView.as_view(), name='api-document-upload'),

    # Dashboards
    path('dashboard/startup/', views.StartupDashboardView.as_view(), name='api-startup-dashboard'),
    path('dashboard/investor/', views.InvestorDashboardView.as_view(), name='api-investor-dashboard'),
    path('dashboard/admin/', views.AdminDashboardView.as_view(), name='api-admin-dashboard'),

    # Admin approvals
    path('admin/startups/<int:startup_id>/approve/', views.AdminStartupApprovalView.as_view(), name='api-admin-startup-approve'),
    path('admin/investors/<int:investor_id>/approve/', views.AdminInvestorApprovalView.as_view(), name='api-admin-investor-approve'),
    path('admin/documents/<int:document_id>/approve/', views.AdminDocumentApprovalView.as_view(), name='api-admin-document-approve'),

    # Funding & investments
    path('funding-requests/', views.FundingRequestListCreateView.as_view(), name='api-funding-requests'),
    path('investment-offers/', views.InvestmentOfferListCreateView.as_view(), name='api-investment-offers'),
    path('investment-offers/<int:offer_id>/action/', views.InvestmentOfferActionView.as_view(), name='api-investment-offer-action'),
    path('investments/', views.InvestmentListView.as_view(), name='api-investments'),
]
