"""
DRF serializers for Fund My Startup API endpoints.
"""

from rest_framework import serializers

from .models import (
    ContactMessage,
    Document,
    FundingRequest,
    Investment,
    InvestmentOffer,
    Investor,
    Startup,
    StartupCategory,
)
from .utils import (
    hash_password,
    parse_funding_range,
    validate_email,
    validate_phone,
    validate_uploaded_file,
)


class StartupCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StartupCategory
        fields = ['category_id', 'category_name', 'description']


class StartupRegistrationSerializer(serializers.Serializer):
    """Validates startup registration payload including file uploads."""

    founder_name = serializers.CharField(max_length=100)
    email = serializers.EmailField(max_length=100)
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField(min_length=6, write_only=True)
    company_name = serializers.CharField(max_length=150)
    website_url = serializers.URLField(required=False, allow_blank=True)
    category_name = serializers.CharField(max_length=100)
    startup_description = serializers.CharField(required=False, allow_blank=True)
    funding_range = serializers.CharField(required=False, allow_blank=True)
    funding_required = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, allow_null=True
    )
    country = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100)
    aadhaar_card = serializers.FileField()
    pitch_deck = serializers.FileField()
    pan_card = serializers.FileField()

    def validate_email(self, value):
        if Startup.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email is already registered.')
        if Investor.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email is already registered.')
        return value.lower()

    def validate_phone(self, value):
        if not validate_phone(value):
            raise serializers.ValidationError('Contact number must contain 10 digits.')
        return value

    def validate(self, attrs):
        for field in ('aadhaar_card', 'pitch_deck', 'pan_card'):
            error = validate_uploaded_file(attrs.get(field))
            if error:
                raise serializers.ValidationError({field: error})

        category_name = attrs.get('category_name', '').strip()
        if not category_name or category_name.lower().startswith('startup category'):
            raise serializers.ValidationError({'category_name': 'Please select a startup category.'})

        category = StartupCategory.objects.filter(category_name__iexact=category_name).first()
        if not category:
            category = StartupCategory.objects.create(category_name=category_name)
        attrs['category'] = category

        amount = attrs.get('funding_required')
        if amount is None:
            amount = parse_funding_range(attrs.get('funding_range', ''))
        if amount is None:
            raise serializers.ValidationError({'funding_range': 'Please select a funding range.'})
        attrs['funding_required'] = amount
        return attrs


class InvestorRegistrationSerializer(serializers.Serializer):
    """Validates investor registration payload including file uploads."""

    full_name = serializers.CharField(max_length=100)
    email = serializers.EmailField(max_length=100)
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField(min_length=6, write_only=True)
    investor_type = serializers.CharField(max_length=100)
    investor_domain = serializers.CharField(max_length=100)
    company_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    investor_description = serializers.CharField(required=False, allow_blank=True)
    investment_range = serializers.CharField(required=False, allow_blank=True)
    max_investment_range = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, allow_null=True
    )
    country = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100)
    aadhaar_card = serializers.FileField()
    pitch_deck = serializers.FileField()
    pan_card = serializers.FileField()

    def validate_email(self, value):
        if Investor.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email is already registered.')
        if Startup.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email is already registered.')
        return value.lower()

    def validate_phone(self, value):
        if not validate_phone(value):
            raise serializers.ValidationError('Contact number must contain 10 digits.')
        return value

    def validate_investor_domain(self, value):
        if not value or value.lower().startswith('investor domain'):
            raise serializers.ValidationError('Please select an investor domain.')
        return value

    def validate(self, attrs):
        for field in ('aadhaar_card', 'pitch_deck', 'pan_card'):
            error = validate_uploaded_file(attrs.get(field))
            if error:
                raise serializers.ValidationError({field: error})

        amount = attrs.get('max_investment_range')
        if amount is None:
            amount = parse_funding_range(attrs.get('investment_range', ''))
        if amount is None:
            raise serializers.ValidationError({'investment_range': 'Please select an investment range.'})
        attrs['max_investment_range'] = amount
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    user_type = serializers.ChoiceField(choices=['startup', 'investor', 'admin'])

    def validate_user_type(self, value):
        return value.lower()


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['message_id', 'name', 'email', 'message', 'created_at']
        read_only_fields = ['message_id', 'created_at']

    def validate_email(self, value):
        if not validate_email(value):
            raise serializers.ValidationError('Please enter a valid email address.')
        return value.lower()


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'document_id',
            'user_type',
            'user_id',
            'document_type',
            'file_path',
            'file_url',
            'status',
            'uploaded_at',
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file_path and request:
            return request.build_absolute_uri(obj.file_path.url)
        if obj.file_path:
            return obj.file_path.url
        return None


class StartupListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    description_preview = serializers.SerializerMethodField()

    class Meta:
        model = Startup
        fields = [
            'startup_id',
            'founder_name',
            'company_name',
            'category_name',
            'startup_description',
            'description_preview',
            'funding_required',
            'country',
            'state',
            'district',
            'profile_status',
            'created_at',
        ]

    def get_description_preview(self, obj):
        if obj.startup_description:
            text = obj.startup_description.strip()
            return text if len(text) <= 160 else f'{text[:157]}...'
        return ''


class PublicStartupDetailSerializer(serializers.ModelSerializer):
    """Public startup profile (no sensitive contact fields)."""

    category_name = serializers.CharField(source='category.category_name', read_only=True)

    class Meta:
        model = Startup
        fields = [
            'startup_id',
            'founder_name',
            'company_name',
            'website_url',
            'startup_description',
            'funding_required',
            'country',
            'state',
            'district',
            'category_name',
            'profile_status',
            'created_at',
        ]


class DocumentUploadSerializer(serializers.Serializer):
    """Validate document re-upload requests."""

    document_type = serializers.ChoiceField(choices=['aadhaar', 'pan', 'pitch_deck'])
    file = serializers.FileField()

    def validate(self, attrs):
        error = validate_uploaded_file(attrs.get('file'))
        if error:
            raise serializers.ValidationError({'file': error})
        return attrs


class StartupDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)

    class Meta:
        model = Startup
        fields = [
            'startup_id',
            'founder_name',
            'email',
            'phone',
            'company_name',
            'website_url',
            'startup_description',
            'funding_required',
            'country',
            'state',
            'district',
            'category_name',
            'profile_status',
            'created_at',
        ]


class InvestorDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investor
        fields = [
            'investor_id',
            'full_name',
            'email',
            'phone',
            'investor_type',
            'investor_domain',
            'company_name',
            'investor_description',
            'max_investment_range',
            'country',
            'state',
            'district',
            'profile_status',
            'created_at',
        ]


class FundingRequestSerializer(serializers.ModelSerializer):
    startup_company = serializers.CharField(source='startup.company_name', read_only=True)

    class Meta:
        model = FundingRequest
        fields = [
            'request_id',
            'startup',
            'startup_company',
            'requested_amount',
            'status',
            'created_at',
        ]
        read_only_fields = ['request_id', 'created_at']


class InvestmentOfferSerializer(serializers.ModelSerializer):
    startup_company = serializers.CharField(source='startup.company_name', read_only=True)
    investor_name = serializers.CharField(source='investor.full_name', read_only=True)

    class Meta:
        model = InvestmentOffer
        fields = [
            'offer_id',
            'startup',
            'startup_company',
            'investor',
            'investor_name',
            'offer_amount',
            'status',
            'created_at',
        ]
        read_only_fields = ['offer_id', 'created_at']


class InvestmentSerializer(serializers.ModelSerializer):
    startup_company = serializers.CharField(source='startup.company_name', read_only=True)
    investor_name = serializers.CharField(source='investor.full_name', read_only=True)

    class Meta:
        model = Investment
        fields = [
            'investment_id',
            'startup',
            'startup_company',
            'investor',
            'investor_name',
            'amount',
            'funded_on',
        ]


class ProfileStatusUpdateSerializer(serializers.Serializer):
    profile_status = serializers.ChoiceField(choices=['pending', 'approved', 'rejected'])


class DocumentStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['pending', 'approved', 'rejected'])
