"""Django admin configuration for Fund My Startup models."""

from django.contrib import admin, messages
from django.utils.html import format_html

from .models import (
    ContactMessage,
    Document,
    DocumentStatus,
    FundingRequest,
    Investment,
    InvestmentOffer,
    Investor,
    PlatformAdmin,
    ProfileStatus,
    Startup,
    StartupCategory,
)


def _status_badge(status):
    """Render profile/document status as a colored badge."""
    colors = {
        'pending': '#f59e0b',
        'approved': '#16a34a',
        'rejected': '#dc2626',
        'open': '#2563eb',
        'funded': '#16a34a',
        'closed': '#64748b',
        'accepted': '#16a34a',
    }
    color = colors.get(status, '#64748b')
    return format_html(
        '<span style="background:{}; color:#fff; padding:3px 10px; border-radius:12px; '
        'font-size:11px; font-weight:600; text-transform:uppercase;">{}</span>',
        color,
        status,
    )


@admin.action(description='Approve selected profiles')
def approve_profiles(modeladmin, request, queryset):
    updated = queryset.update(profile_status=ProfileStatus.APPROVED)
    modeladmin.message_user(
        request,
        f'{updated} profile(s) approved successfully.',
        messages.SUCCESS,
    )


@admin.action(description='Reject selected profiles')
def reject_profiles(modeladmin, request, queryset):
    updated = queryset.update(profile_status=ProfileStatus.REJECTED)
    modeladmin.message_user(
        request,
        f'{updated} profile(s) rejected.',
        messages.WARNING,
    )


@admin.action(description='Set selected profiles to Pending')
def set_profiles_pending(modeladmin, request, queryset):
    updated = queryset.update(profile_status=ProfileStatus.PENDING)
    modeladmin.message_user(
        request,
        f'{updated} profile(s) set to pending.',
        messages.INFO,
    )


@admin.action(description='Approve selected documents')
def approve_documents(modeladmin, request, queryset):
    updated = queryset.update(status=DocumentStatus.APPROVED)
    modeladmin.message_user(
        request,
        f'{updated} document(s) approved.',
        messages.SUCCESS,
    )


@admin.register(StartupCategory)
class StartupCategoryAdmin(admin.ModelAdmin):
    list_display = ('category_id', 'category_name')
    search_fields = ('category_name',)


@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display = (
        'startup_id',
        'company_name',
        'founder_name',
        'email',
        'status_badge',
        'profile_status',
        'created_at',
    )
    list_display_links = ('startup_id', 'company_name')
    list_editable = ('profile_status',)
    list_filter = ('profile_status', 'country', 'state')
    search_fields = ('company_name', 'founder_name', 'email')
    readonly_fields = ('startup_id', 'password', 'created_at')
    actions = [approve_profiles, reject_profiles, set_profiles_pending]
    list_per_page = 25

    fieldsets = (
        (
            'Approval Status',
            {
                'fields': ('profile_status',),
                'description': 'Change to "Approved" to allow this startup on the public site and investor dashboard.',
            },
        ),
        (
            'Account',
            {
                'fields': (
                    'startup_id',
                    'founder_name',
                    'email',
                    'phone',
                    'password',
                    'created_at',
                ),
            },
        ),
        (
            'Company',
            {
                'fields': (
                    'company_name',
                    'website_url',
                    'category',
                    'startup_description',
                    'funding_required',
                ),
            },
        ),
        (
            'Location',
            {
                'fields': ('country', 'state', 'district'),
            },
        ),
    )

    @admin.display(description='Status', ordering='profile_status')
    def status_badge(self, obj):
        return _status_badge(obj.profile_status)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.profile_status == ProfileStatus.APPROVED:
            messages.success(request, f'Startup "{obj.company_name}" is now APPROVED.')
        elif obj.profile_status == ProfileStatus.REJECTED:
            messages.warning(request, f'Startup "{obj.company_name}" was REJECTED.')


@admin.register(Investor)
class InvestorAdmin(admin.ModelAdmin):
    list_display = (
        'investor_id',
        'full_name',
        'email',
        'investor_type',
        'status_badge',
        'profile_status',
        'created_at',
    )
    list_display_links = ('investor_id', 'full_name')
    list_editable = ('profile_status',)
    list_filter = ('profile_status', 'investor_type')
    search_fields = ('full_name', 'email', 'company_name')
    readonly_fields = ('investor_id', 'password', 'created_at')
    actions = [approve_profiles, reject_profiles, set_profiles_pending]
    list_per_page = 25

    fieldsets = (
        (
            'Approval Status',
            {
                'fields': ('profile_status',),
                'description': 'Change to "Approved" so this investor can browse startups and submit offers.',
            },
        ),
        (
            'Account',
            {
                'fields': (
                    'investor_id',
                    'full_name',
                    'email',
                    'phone',
                    'password',
                    'created_at',
                ),
            },
        ),
        (
            'Investor Details',
            {
                'fields': (
                    'investor_type',
                    'investor_domain',
                    'company_name',
                    'investor_description',
                    'max_investment_range',
                ),
            },
        ),
        (
            'Location',
            {
                'fields': ('country', 'state', 'district'),
            },
        ),
    )

    @admin.display(description='Status', ordering='profile_status')
    def status_badge(self, obj):
        return _status_badge(obj.profile_status)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.profile_status == ProfileStatus.APPROVED:
            messages.success(request, f'Investor "{obj.full_name}" is now APPROVED.')
        elif obj.profile_status == ProfileStatus.REJECTED:
            messages.warning(request, f'Investor "{obj.full_name}" was REJECTED.')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        'document_id',
        'user_type',
        'user_id',
        'document_type',
        'doc_status_badge',
        'status',
        'uploaded_at',
    )
    list_display_links = ('document_id',)
    list_editable = ('status',)
    list_filter = ('user_type', 'document_type', 'status')
    actions = [approve_documents]
    readonly_fields = ('document_id', 'uploaded_at', 'file_path')

    @admin.display(description='Status', ordering='status')
    def doc_status_badge(self, obj):
        return _status_badge(obj.status)


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('message_id', 'name', 'email', 'message_preview', 'created_at')
    search_fields = ('name', 'email', 'message')
    readonly_fields = ('message_id', 'created_at')

    @admin.display(description='Message')
    def message_preview(self, obj):
        if obj.message:
            return obj.message[:100] + '...' if len(obj.message) > 100 else obj.message
        return ''



@admin.register(FundingRequest)
class FundingRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'startup', 'requested_amount', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(InvestmentOffer)
class InvestmentOfferAdmin(admin.ModelAdmin):
    list_display = ('offer_id', 'startup', 'investor', 'offer_amount', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ('investment_id', 'startup', 'investor', 'amount', 'funded_on')


@admin.register(PlatformAdmin)
class PlatformAdminAdmin(admin.ModelAdmin):
    list_display = ('admin_id', 'name', 'email', 'created_at')
    search_fields = ('name', 'email')
    readonly_fields = ('admin_id', 'password', 'created_at')
