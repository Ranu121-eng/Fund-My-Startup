"""
API views for Fund My Startup.
Handles registration, login, contact, dashboards, funding, and admin workflows.
"""

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import build_tokens
from .models import (
    ContactMessage,
    Document,
    DocumentType,
    FundingRequest,
    FundingRequestStatus,
    Investment,
    InvestmentOffer,
    Investor,
    OfferStatus,
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
    FundingRequestSerializer,
    InvestmentOfferSerializer,
    InvestmentSerializer,
    InvestorDetailSerializer,
    InvestorRegistrationSerializer,
    LoginSerializer,
    ProfileStatusUpdateSerializer,
    PublicStartupDetailSerializer,
    StartupCategorySerializer,
    StartupDetailSerializer,
    StartupListSerializer,
    StartupRegistrationSerializer,
)
from .utils import hash_password, verify_password


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
                'message': 'Startup registration submitted successfully. Status: Pending approval.',
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
                'message': 'Investor registration submitted successfully. Status: Pending approval.',
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
