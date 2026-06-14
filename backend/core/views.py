"""
API views for Fund My Startup.
Handles registration, login, contact, dashboards, funding, and admin workflows.
"""

from datetime import timedelta
from decimal import Decimal
import secrets
import urllib.parse

from django.core import signing
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
import pyotp
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


from .authentication import build_tokens
from .models import (
    ContactMessage,
    Document,
    DocumentType,
    EmailVerificationToken,
    FundingRequest,
    FundingRequestStatus,
    Investment,
    InvestmentOffer,
    Investor,
    OfferStatus,
    PasswordResetToken,
    PlatformAdmin,
    ProfileStatus,
    Startup,
    StartupCategory,
    UserType,
)
from .permissions import IsInvestorUser, IsPlatformAdmin, IsStartupOrInvestor, IsStartupUser
from .serializers import (
    ContactMessageSerializer,
    DocumentSerializer,
    DocumentStatusUpdateSerializer,
    DocumentUploadSerializer,
    ForgotPasswordSerializer,
    FundingRequestSerializer,
    InvestmentOfferSerializer,
    InvestmentSerializer,
    InvestorDetailSerializer,
    PublicInvestorDetailSerializer,
    InvestorRegistrationSerializer,
    InvestorListSerializer,
    LoginSerializer,
    ProfileStatusUpdateSerializer,
    PublicStartupDetailSerializer,
    ResetPasswordSerializer,
    StartupCategorySerializer,
    StartupDetailSerializer,
    StartupListSerializer,
    StartupRegistrationSerializer,
)

from rest_framework.throttling import ScopedRateThrottle

from .utils import hash_password, verify_password, password_reset_token_generator



class HealthCheckView(APIView):
    """Simple health check so the frontend can verify the backend is running."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                'success': True,
                'message': 'Fund My Startup API is running.',
                'frontend_url': 'http://127.0.0.1:8000/frontend/index.html',
                'admin_url': 'http://127.0.0.1:8000/admin/',
            }
        )


def save_user_documents(user_type, user_id, files_dict):
    """Persist uploaded KYC/pitch files to the documents table."""
    mapping = {
        'aadhaar_card': DocumentType.AADHAAR,
        'pitch_deck': DocumentType.PITCH_DECK,
        'pan_card': DocumentType.PAN,
    }
    created = []
    for field_name, doc_type in mapping.items():
        uploaded = files_dict.get(field_name)
        if uploaded:
            document = Document.objects.create(
                user_type=user_type,
                user_id=user_id,
                document_type=doc_type,
                file_path=uploaded,
            )
            created.append(document)
    return created


class StartupRegisterView(APIView):
    """Register a new startup account with documents. Status defaults to pending."""

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = StartupRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        startup = Startup.objects.create(
            founder_name=data['founder_name'],
            email=data['email'],
            phone=data['phone'],
            password=hash_password(data['password']),
            company_name=data['company_name'],
            website_url=data.get('website_url') or None,
            startup_description=data.get('startup_description') or None,
            funding_required=data['funding_required'],
            country=data['country'],
            state=data['state'],
            district=data['district'],
            category=data['category'],
            profile_status=ProfileStatus.PENDING,
            is_email_verified=True,
        )

        save_user_documents(
            UserType.STARTUP,
            startup.startup_id,
            {
                'aadhaar_card': data['aadhaar_card'],
                'pitch_deck': data['pitch_deck'],
                'pan_card': data['pan_card'],
            },
        )

        FundingRequest.objects.create(
            startup=startup,
            requested_amount=data['funding_required'],
            status=FundingRequestStatus.OPEN,
        )

        return Response(
            {
                'success': True,
                'message': 'Startup registration submitted successfully. Your profile will be reviewed by the platform administrator for approval.',
                'startup_id': startup.startup_id,
                'profile_status': startup.profile_status,
            },
            status=status.HTTP_201_CREATED,
        )


class InvestorRegisterView(APIView):
    """Register a new investor account with documents. Status defaults to pending."""

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = InvestorRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        investor = Investor.objects.create(
            full_name=data['full_name'],
            email=data['email'],
            phone=data['phone'],
            password=hash_password(data['password']),
            investor_type=data['investor_type'],
            investor_domain=data['investor_domain'],
            company_name=data.get('company_name') or None,
            investor_description=data.get('investor_description') or None,
            max_investment_range=data['max_investment_range'],
            country=data['country'],
            state=data['state'],
            district=data['district'],
            profile_status=ProfileStatus.PENDING,
            is_email_verified=True,
        )

        save_user_documents(
            UserType.INVESTOR,
            investor.investor_id,
            {
                'aadhaar_card': data['aadhaar_card'],
                'pitch_deck': data['pitch_deck'],
                'pan_card': data['pan_card'],
            },
        )

        return Response(
            {
                'success': True,
                'message': 'Investor registration submitted successfully. Your profile will be reviewed by the platform administrator for approval.',
                'investor_id': investor.investor_id,
                'profile_status': investor.profile_status,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Authenticate startup, investor, or admin and return JWT tokens."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()
        password = serializer.validated_data['password']
        user_type = serializer.validated_data['user_type']

        account = None
        redirect_url = None

        if user_type == 'startup':
            account = Startup.objects.filter(email__iexact=email).first()
            redirect_url = '/frontend/startup-dashboard.html'
        elif user_type == 'investor':
            account = Investor.objects.filter(email__iexact=email).first()
            redirect_url = '/frontend/investor-dashboard.html'
        elif user_type == 'admin':
            account = PlatformAdmin.objects.filter(email__iexact=email).first()
            redirect_url = '/frontend/admin-dashboard.html'

        if not account or not verify_password(password, account.password):
            return Response(
                {'success': False, 'message': 'Invalid email, password, or user type.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )



        profile_status = getattr(account, 'profile_status', None)
        if profile_status == ProfileStatus.REJECTED:
            return Response(
                {'success': False, 'message': 'Your account has been rejected. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Enforce 2FA check
        if getattr(account, 'is_two_factor_enabled', False):
            user_id = getattr(account, 'startup_id', None) or getattr(account, 'investor_id', None) or account.admin_id
            temp_token = signing.dumps({
                'user_id': user_id,
                'user_type': user_type,
                'email': email
            }, salt='fms-2fa-login')
            return Response({
                'success': True,
                'requires_2fa': True,
                'two_factor_token': temp_token,
                'message': 'Two-factor authentication code is required to complete login.'
            }, status=status.HTTP_200_OK)

        user_id = getattr(account, 'startup_id', None) or getattr(account, 'investor_id', None) or account.admin_id
        tokens = build_tokens(user_type, user_id, email)

        display_name = getattr(account, 'founder_name', None) or getattr(account, 'full_name', None) or account.name

        return Response(
            {
                'success': True,
                'message': 'Login successful.',
                'user_type': user_type,
                'user_id': user_id,
                'display_name': display_name,
                'email': email,
                'profile_status': profile_status,
                'redirect_url': redirect_url,
                'tokens': tokens,
            },
            status=status.HTTP_200_OK,
        )


class ContactMessageView(generics.CreateAPIView):
    """Save contact form submissions."""

    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                'success': True,
                'message': 'Message sent successfully!',
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class StartupCategoryListView(generics.ListAPIView):
    """List all startup categories for dropdown population."""

    queryset = StartupCategory.objects.all().order_by('category_name')
    serializer_class = StartupCategorySerializer
    permission_classes = [AllowAny]


class ApprovedStartupListView(generics.ListAPIView):
    """Public list of approved startups."""

    serializer_class = StartupListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Startup.objects.filter(profile_status=ProfileStatus.APPROVED).select_related('category')
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__category_name__iexact=category)
        return queryset.order_by('-created_at')


class ApprovedInvestorListView(generics.ListAPIView):
    """Public list of approved investors."""

    serializer_class = InvestorListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Investor.objects.filter(profile_status=ProfileStatus.APPROVED)
        domain = self.request.query_params.get('domain')
        if domain:
            queryset = queryset.filter(investor_domain__iexact=domain)
        return queryset.order_by('-created_at')


class StartupDetailView(APIView):
    """Public detail for an approved startup. Investors receive full contact info."""

    permission_classes = [AllowAny]

    def get(self, request, startup_id):
        startup = get_object_or_404(
            Startup.objects.select_related('category'),
            startup_id=startup_id,
            profile_status=ProfileStatus.APPROVED,
        )
        user = getattr(request, 'user', None)
        if getattr(user, 'is_authenticated', False) and user.user_type == 'investor':
            data = StartupDetailSerializer(startup).data
        else:
            data = PublicStartupDetailSerializer(startup).data
        return Response({'success': True, 'startup': data})


class InvestorDetailView(APIView):
    """Public detail for an approved investor. Startups receive full contact info."""

    permission_classes = [AllowAny]

    def get(self, request, investor_id):
        investor = get_object_or_404(
            Investor,
            investor_id=investor_id,
            profile_status=ProfileStatus.APPROVED,
        )
        user = getattr(request, 'user', None)
        if getattr(user, 'is_authenticated', False) and user.user_type == 'startup':
            data = InvestorDetailSerializer(investor).data
        else:
            data = PublicInvestorDetailSerializer(investor).data
        return Response({'success': True, 'investor': data})



class DocumentUploadView(APIView):
    """Allow startups/investors to re-upload KYC or pitch deck documents."""

    permission_classes = [IsAuthenticated, IsStartupOrInvestor]

    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user_type = request.user.user_type

        document = Document.objects.create(
            user_type=user_type,
            user_id=request.user.user_id,
            document_type=data['document_type'],
            file_path=data['file'],
        )
        return Response(
            {
                'success': True,
                'message': 'Document uploaded successfully.',
                'document': DocumentSerializer(document, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StartupDashboardView(APIView):
    """Dashboard data for logged-in startup."""

    permission_classes = [IsAuthenticated, IsStartupUser]

    def get(self, request):
        startup = Startup.objects.select_related('category').get(startup_id=request.user.user_id)
        total_funded = (
            Investment.objects.filter(startup=startup).aggregate(total=Sum('amount'))['total']
            or Decimal('0')
        )
        offers = InvestmentOffer.objects.filter(startup=startup).count()
        funding_requests = FundingRequest.objects.filter(startup=startup)
        documents = Document.objects.filter(user_type=UserType.STARTUP, user_id=startup.startup_id)

        profile_fields = [
            startup.company_name,
            startup.startup_description,
            startup.funding_required,
            startup.country,
            startup.state,
            startup.district,
            startup.category_id,
        ]
        filled = sum(1 for field in profile_fields if field)
        profile_completion = int((filled / len(profile_fields)) * 100)

        return Response(
            {
                'success': True,
                'startup': StartupDetailSerializer(startup).data,
                'stats': {
                    'total_funding_raised': str(total_funded),
                    'interested_investors': offers,
                    'investment_offers': offers,
                    'documents_uploaded': documents.count(),
                    'profile_completion_percent': profile_completion,
                },
                'funding_requests': FundingRequestSerializer(funding_requests, many=True).data,
                'investment_offers': InvestmentOfferSerializer(
                    InvestmentOffer.objects.filter(startup=startup).select_related('investor'),
                    many=True,
                ).data,
                'documents': DocumentSerializer(documents, many=True, context={'request': request}).data,
            }
        )


class InvestorDashboardView(APIView):
    """Dashboard data for logged-in investor."""

    permission_classes = [IsAuthenticated, IsInvestorUser]

    def get(self, request):
        investor = Investor.objects.get(investor_id=request.user.user_id)
        total_invested = (
            Investment.objects.filter(investor=investor).aggregate(total=Sum('amount'))['total']
            or Decimal('0')
        )
        offers_sent = InvestmentOffer.objects.filter(investor=investor).count()
        approved_startups = Startup.objects.filter(profile_status=ProfileStatus.APPROVED).select_related('category')[:20]

        return Response(
            {
                'success': True,
                'investor': InvestorDetailSerializer(investor).data,
                'stats': {
                    'total_investments': str(total_invested),
                    'offers_sent': offers_sent,
                    'saved_startups': 0,
                    'meeting_requests': 0,
                },
                'startups': StartupListSerializer(approved_startups, many=True).data,
                'my_offers': InvestmentOfferSerializer(
                    InvestmentOffer.objects.filter(investor=investor).select_related('startup'),
                    many=True,
                ).data,
                'my_investments': InvestmentSerializer(
                    Investment.objects.filter(investor=investor).select_related('startup'),
                    many=True,
                ).data,
            }
        )


class AdminDashboardView(APIView):
    """Overview stats for platform admin."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        return Response(
            {
                'success': True,
                'stats': {
                    'total_startups': Startup.objects.count(),
                    'pending_startups': Startup.objects.filter(profile_status=ProfileStatus.PENDING).count(),
                    'total_investors': Investor.objects.count(),
                    'pending_investors': Investor.objects.filter(profile_status=ProfileStatus.PENDING).count(),
                    'total_contact_messages': ContactMessage.objects.count(),
                    'open_funding_requests': FundingRequest.objects.filter(status=FundingRequestStatus.OPEN).count(),
                    'pending_offers': InvestmentOffer.objects.filter(status=OfferStatus.PENDING).count(),
                },
                'pending_startups': StartupListSerializer(
                    Startup.objects.filter(profile_status=ProfileStatus.PENDING).select_related('category'),
                    many=True,
                ).data,
                'pending_investors': InvestorDetailSerializer(
                    Investor.objects.filter(profile_status=ProfileStatus.PENDING),
                    many=True,
                ).data,
                'contact_messages': ContactMessageSerializer(
                    ContactMessage.objects.all().order_by('-created_at'),
                    many=True,
                ).data,
            }
        )


class AdminStartupApprovalView(APIView):
    """Approve or reject a startup profile."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, startup_id):
        serializer = ProfileStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            startup = Startup.objects.get(startup_id=startup_id)
        except Startup.DoesNotExist:
            return Response({'success': False, 'message': 'Startup not found.'}, status=status.HTTP_404_NOT_FOUND)

        startup.profile_status = serializer.validated_data['profile_status']
        startup.save(update_fields=['profile_status'])
        return Response(
            {
                'success': True,
                'message': f'Startup profile marked as {startup.profile_status}.',
                'startup': StartupDetailSerializer(startup).data,
            }
        )


class AdminInvestorApprovalView(APIView):
    """Approve or reject an investor profile."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, investor_id):
        serializer = ProfileStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            investor = Investor.objects.get(investor_id=investor_id)
        except Investor.DoesNotExist:
            return Response({'success': False, 'message': 'Investor not found.'}, status=status.HTTP_404_NOT_FOUND)

        investor.profile_status = serializer.validated_data['profile_status']
        investor.save(update_fields=['profile_status'])
        return Response(
            {
                'success': True,
                'message': f'Investor profile marked as {investor.profile_status}.',
                'investor': InvestorDetailSerializer(investor).data,
            }
        )


class AdminDocumentApprovalView(APIView):
    """Approve or reject uploaded documents."""

    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, document_id):
        serializer = DocumentStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            document = Document.objects.get(document_id=document_id)
        except Document.DoesNotExist:
            return Response({'success': False, 'message': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        document.status = serializer.validated_data['status']
        document.save(update_fields=['status'])
        return Response(
            {
                'success': True,
                'message': f'Document marked as {document.status}.',
                'document': DocumentSerializer(document, context={'request': request}).data,
            }
        )


class FundingRequestListCreateView(APIView):
    """List/create funding requests."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.user_type == 'startup':
            qs = FundingRequest.objects.filter(startup_id=request.user.user_id)
        elif request.user.user_type == 'admin':
            qs = FundingRequest.objects.all()
        else:
            qs = FundingRequest.objects.filter(status=FundingRequestStatus.OPEN)
        return Response(FundingRequestSerializer(qs.select_related('startup'), many=True).data)

    def post(self, request):
        if request.user.user_type != 'startup':
            return Response({'success': False, 'message': 'Only startups can create funding requests.'}, status=403)

        amount = request.data.get('requested_amount')
        if not amount:
            return Response({'success': False, 'message': 'requested_amount is required.'}, status=400)

        startup = Startup.objects.get(startup_id=request.user.user_id)
        funding_request = FundingRequest.objects.create(
            startup=startup,
            requested_amount=amount,
            status=FundingRequestStatus.OPEN,
        )
        return Response(
            {'success': True, 'funding_request': FundingRequestSerializer(funding_request).data},
            status=status.HTTP_201_CREATED,
        )


class InvestmentOfferListCreateView(APIView):
    """Investors submit offers; startups/admins can list them."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.user_type == 'startup':
            qs = InvestmentOffer.objects.filter(startup_id=request.user.user_id)
        elif request.user.user_type == 'investor':
            qs = InvestmentOffer.objects.filter(investor_id=request.user.user_id)
        else:
            qs = InvestmentOffer.objects.all()
        return Response(
            InvestmentOfferSerializer(qs.select_related('startup', 'investor'), many=True).data
        )

    def post(self, request):
        if request.user.user_type != 'investor':
            return Response({'success': False, 'message': 'Only investors can create offers.'}, status=403)

        startup_id = request.data.get('startup_id')
        offer_amount = request.data.get('offer_amount')
        if not startup_id or not offer_amount:
            return Response({'success': False, 'message': 'startup_id and offer_amount are required.'}, status=400)

        try:
            startup = Startup.objects.get(startup_id=startup_id, profile_status=ProfileStatus.APPROVED)
        except Startup.DoesNotExist:
            return Response({'success': False, 'message': 'Approved startup not found.'}, status=404)

        investor = Investor.objects.get(investor_id=request.user.user_id)
        offer = InvestmentOffer.objects.create(
            startup=startup,
            investor=investor,
            offer_amount=offer_amount,
            status=OfferStatus.PENDING,
        )
        return Response(
            {'success': True, 'offer': InvestmentOfferSerializer(offer).data},
            status=status.HTTP_201_CREATED,
        )


class InvestmentOfferActionView(APIView):
    """Startup accepts/rejects an investment offer."""

    permission_classes = [IsAuthenticated, IsStartupUser]

    @transaction.atomic
    def patch(self, request, offer_id):
        action = request.data.get('action')
        if action not in ('accepted', 'rejected'):
            return Response({'success': False, 'message': 'action must be accepted or rejected.'}, status=400)

        try:
            offer = InvestmentOffer.objects.select_related('startup', 'investor').get(
                offer_id=offer_id,
                startup_id=request.user.user_id,
            )
        except InvestmentOffer.DoesNotExist:
            return Response({'success': False, 'message': 'Offer not found.'}, status=404)

        offer.status = action
        offer.save(update_fields=['status'])

        investment = None
        if action == 'accepted':
            investment = Investment.objects.create(
                startup=offer.startup,
                investor=offer.investor,
                amount=offer.offer_amount,
            )
            funding_request = FundingRequest.objects.filter(
                startup=offer.startup,
                status=FundingRequestStatus.OPEN,
            ).first()
            if funding_request:
                funding_request.status = FundingRequestStatus.FUNDED
                funding_request.save(update_fields=['status'])

        return Response(
            {
                'success': True,
                'message': f'Offer {action}.',
                'offer': InvestmentOfferSerializer(offer).data,
                'investment': InvestmentSerializer(investment).data if investment else None,
            }
        )


class InvestmentListView(APIView):
    """List completed investments for the current user or admin."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.user_type == 'startup':
            qs = Investment.objects.filter(startup_id=request.user.user_id)
        elif request.user.user_type == 'investor':
            qs = Investment.objects.filter(investor_id=request.user.user_id)
        else:
            qs = Investment.objects.all()
        return Response(InvestmentSerializer(qs.select_related('startup', 'investor'), many=True).data)


class ForgotPasswordView(APIView):
    """Generate password reset token and send reset link to the user."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()
        user_type = serializer.validated_data['user_type']

        # Determine if email exists in corresponding table and fetch the account
        account = None
        if user_type == 'startup':
            account = Startup.objects.filter(email__iexact=email).first()
        elif user_type == 'investor':
            account = Investor.objects.filter(email__iexact=email).first()
        elif user_type == 'admin':
            account = PlatformAdmin.objects.filter(email__iexact=email).first()

        if account:
            # Generate secure token using Django's PasswordResetTokenGenerator logic
            token = password_reset_token_generator.make_token(account)
            expires_at = timezone.now() + timedelta(hours=1)

            # Deactivate previous tokens for this email just in case
            PasswordResetToken.objects.filter(email=email, user_type=user_type, is_used=False).update(is_used=True)

            # Create token entry
            PasswordResetToken.objects.create(
                email=email,
                user_type=user_type,
                token=token,
                expires_at=expires_at,
            )

            # Send Email
            # Using absolute URI if request is available, or absolute local fallback
            base_url = request.build_absolute_uri('/')[:-1] if request else 'http://127.0.0.1:8000'
            reset_link = f"{base_url}/frontend/reset-password.html?token={token}&email={email}&type={user_type}"

            subject = "Reset Your Password - Fund My Startup"
            message = (
                f"Hello,\n\n"
                f"We received a request to reset your password for your Fund My Startup {user_type} account.\n"
                f"Please click the link below to set a new password. The link is valid for 1 hour:\n\n"
                f"{reset_link}\n\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"Regards,\n"
                f"Fund My Startup Team"
            )
            html_message = (
                f"<div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>"
                f"<h2>Reset Your Password</h2>"
                f"<p>Hello,</p>"
                f"<p>We received a request to reset the password for your Fund My Startup <strong>{user_type}</strong> account.</p>"
                f"<p>Please click the button below to reset your password. This link is valid for 1 hour.</p>"
                f"<div style='margin: 25px 0;'>"
                f"  <a href='{reset_link}' style='background-color: #f7934c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Reset Password</a>"
                f"</div>"
                f"<p>Or copy and paste this URL into your browser:</p>"
                f"<p><a href='{reset_link}'>{reset_link}</a></p>"
                f"<p>If you did not request this reset, you can safely ignore this email.</p>"
                f"<hr style='border: none; border-top: 1px solid #eee; margin-top: 30px;' />"
                f"<p style='font-size: 12px; color: #777;'>This email was sent automatically by Fund My Startup.</p>"
                f"</div>"
            )

            try:
                send_mail(
                    subject,
                    message,
                    'no-reply@fundmystartup.com',
                    [email],
                    fail_silently=False,
                    html_message=html_message,
                )
            except Exception as e:
                # Log the error but don't crash
                print(f"Failed to send email to {email}: {e}")

        # Always return success response for security (prevents user enumeration)
        return Response(
            {
                'success': True,
                'message': 'If the email is registered, a password reset link has been sent to it.',
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """Verify reset token and update user password."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    @transaction.atomic
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        user_type = serializer.validated_data['user_type']

        # Retrieve user first
        account = None
        if user_type == 'startup':
            account = Startup.objects.filter(email__iexact=email).first()
        elif user_type == 'investor':
            account = Investor.objects.filter(email__iexact=email).first()
        elif user_type == 'admin':
            account = PlatformAdmin.objects.filter(email__iexact=email).first()

        if not account:
            return Response(
                {'success': False, 'message': 'User account not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Look up valid token entry in database
        token_entry = PasswordResetToken.objects.filter(
            email=email,
            token=token,
            user_type=user_type,
            is_used=False,
            expires_at__gt=timezone.now(),
        ).first()

        if not token_entry:
            return Response(
                {
                    'success': False,
                    'message': 'The reset link is invalid, expired, or has already been used.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify token cryptographically using Django's PasswordResetTokenGenerator
        if not password_reset_token_generator.check_token(account, token):
            return Response(
                {
                    'success': False,
                    'message': 'The reset link is invalid, expired, or has already been used.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update password
        account.password = hash_password(password)
        account.save(update_fields=['password'])

        # Mark token as used
        token_entry.is_used = True
        token_entry.save(update_fields=['is_used'])

        return Response(
            {
                'success': True,
                'message': 'Your password has been successfully reset. You can now log in.',
            },
            status=status.HTTP_200_OK,
        )


class VerifyEmailView(APIView):
    """Verify registration email token and activate account status."""

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        token = request.data.get('token')
        email = request.data.get('email')
        user_type = request.data.get('user_type')

        if not token or not email or not user_type:
            return Response(
                {'success': False, 'message': 'token, email, and user_type are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_entry = EmailVerificationToken.objects.filter(
            email=email.lower(),
            token=token,
            user_type=user_type,
            is_used=False,
        ).first()

        if not token_entry:
            return Response(
                {'success': False, 'message': 'Invalid, expired, or already used verification link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark user as email verified
        if user_type == 'startup':
            account = Startup.objects.filter(email__iexact=email).first()
        elif user_type == 'investor':
            account = Investor.objects.filter(email__iexact=email).first()
        else:
            account = None

        if not account:
            return Response(
                {'success': False, 'message': 'User account not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        account.is_email_verified = True
        account.save(update_fields=['is_email_verified'])

        # Mark token as used
        token_entry.is_used = True
        token_entry.save(update_fields=['is_used'])

        return Response(
            {
                'success': True,
                'message': 'Your email address has been successfully verified. It is now awaiting admin approval.',
            },
            status=status.HTTP_200_OK,
        )


class Login2FAView(APIView):
    """Complete login using TOTP code."""

    permission_classes = [AllowAny]

    def post(self, request):
        two_factor_token = request.data.get('two_factor_token')
        otp_code = request.data.get('otp_code')

        if not two_factor_token or not otp_code:
            return Response(
                {'success': False, 'message': 'two_factor_token and otp_code are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = signing.loads(two_factor_token, salt='fms-2fa-login', max_age=300)
        except signing.SignatureExpired:
            return Response({'success': False, 'message': 'The 2FA session has expired. Please log in again.'}, status=400)
        except signing.BadSignature:
            return Response({'success': False, 'message': 'Invalid 2FA session.'}, status=400)

        user_id = data['user_id']
        user_type = data['user_type']
        email = data['email']

        account = None
        redirect_url = None
        if user_type == 'startup':
            account = Startup.objects.filter(startup_id=user_id).first()
            redirect_url = '/frontend/startup-dashboard.html'
        elif user_type == 'investor':
            account = Investor.objects.filter(investor_id=user_id).first()
            redirect_url = '/frontend/investor-dashboard.html'
        elif user_type == 'admin':
            account = PlatformAdmin.objects.filter(admin_id=user_id).first()
            redirect_url = '/frontend/admin-dashboard.html'

        if not account:
            return Response({'success': False, 'message': 'Account not found.'}, status=404)

        # Verify code
        totp = pyotp.TOTP(account.two_factor_secret)
        if not totp.verify(otp_code):
            return Response({'success': False, 'message': 'Invalid 2FA code.'}, status=400)

        # Success! Build tokens
        tokens = build_tokens(user_type, user_id, email)
        display_name = getattr(account, 'founder_name', None) or getattr(account, 'full_name', None) or account.name
        profile_status = getattr(account, 'profile_status', None)

        return Response(
            {
                'success': True,
                'message': 'Login successful.',
                'user_type': user_type,
                'user_id': user_id,
                'display_name': display_name,
                'email': email,
                'profile_status': profile_status,
                'redirect_url': redirect_url,
                'tokens': tokens,
            },
            status=status.HTTP_200_OK,
        )


class Setup2FAView(APIView):
    """Prepare 2FA setup for authenticated users by generating secret and QR code."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_type = request.user.user_type
        user_id = request.user.user_id
        email = request.user.email

        # Generate a random base32 secret
        secret = pyotp.random_base32()

        # Update the user's secret temporarily (disabled until verified)
        if user_type == 'startup':
            Startup.objects.filter(startup_id=user_id).update(two_factor_secret=secret)
        elif user_type == 'investor':
            Investor.objects.filter(investor_id=user_id).update(two_factor_secret=secret)
        elif user_type == 'admin':
            PlatformAdmin.objects.filter(admin_id=user_id).update(two_factor_secret=secret)

        # Generate URI for QR code scanning
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=email, issuer_name="FundMyStartup")
        qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={urllib.parse.quote(uri)}"

        return Response(
            {
                'success': True,
                'secret': secret,
                'provisioning_uri': uri,
                'qr_code_url': qr_code_url,
            }
        )


class Verify2FAEnableView(APIView):
    """Verify code and fully enable 2FA on user account."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'success': False, 'message': 'Verification code is required.'}, status=400)

        user_type = request.user.user_type
        user_id = request.user.user_id

        account = None
        if user_type == 'startup':
            account = Startup.objects.filter(startup_id=user_id).first()
        elif user_type == 'investor':
            account = Investor.objects.filter(investor_id=user_id).first()
        elif user_type == 'admin':
            account = PlatformAdmin.objects.filter(admin_id=user_id).first()

        if not account or not account.two_factor_secret:
            return Response({'success': False, 'message': '2FA setup was not initialized.'}, status=400)

        # Verify OTP code
        totp = pyotp.TOTP(account.two_factor_secret)
        if not totp.verify(code):
            return Response({'success': False, 'message': 'Invalid verification code.'}, status=400)

        # Enable 2FA
        account.is_two_factor_enabled = True
        account.save(update_fields=['is_two_factor_enabled'])

        return Response(
            {
                'success': True,
                'message': 'Two-factor authentication has been successfully enabled on your account.',
            }
        )


class Disable2FAView(APIView):
    """Disable 2FA on user account after verifying code."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'success': False, 'message': 'Verification code is required.'}, status=400)

        user_type = request.user.user_type
        user_id = request.user.user_id

        account = None
        if user_type == 'startup':
            account = Startup.objects.filter(startup_id=user_id).first()
        elif user_type == 'investor':
            account = Investor.objects.filter(investor_id=user_id).first()
        elif user_type == 'admin':
            account = PlatformAdmin.objects.filter(admin_id=user_id).first()

        if not account or not account.is_two_factor_enabled:
            return Response({'success': False, 'message': '2FA is not enabled on this account.'}, status=400)

        # Verify code
        totp = pyotp.TOTP(account.two_factor_secret)
        if not totp.verify(code):
            return Response({'success': False, 'message': 'Invalid verification code.'}, status=400)

        # Disable 2FA
        account.is_two_factor_enabled = False
        account.two_factor_secret = None
        account.save(update_fields=['is_two_factor_enabled', 'two_factor_secret'])

        return Response(
            {
                'success': True,
                'message': 'Two-factor authentication has been successfully disabled.',
            }
        )


class ApiRootView(APIView):
    """API root endpoint returning system status."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'success': True,
            'message': 'Welcome to Fund My Startup API!',
            'version': '1.0.0',
            'status': 'running'
        })




