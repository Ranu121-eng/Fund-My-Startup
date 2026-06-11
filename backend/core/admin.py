"""Django admin configuration for Fund My Startup models."""

from django.contrib import admin

from .models import (
    ContactMessage,
    Document,
    FundingRequest,
    Investment,
    InvestmentOffer,
    Investor,
    PlatformAdmin,
    Startup,
    StartupCategory,
)


@admin.register(StartupCategory)
class StartupCategoryAdmin(admin.ModelAdmin):
    list_display = ('category_id', 'category_name')
    search_fields = ('category_name',)


@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display = ('startup_id', 'company_name', 'founder_name', 'email', 'profile_status', 'created_at')
    list_filter = ('profile_status', 'country', 'state')
    search_fields = ('company_name', 'founder_name', 'email')


@admin.register(Investor)
class InvestorAdmin(admin.ModelAdmin):
    list_display = ('investor_id', 'full_name', 'email', 'investor_type', 'profile_status', 'created_at')
    list_filter = ('profile_status', 'investor_type')
    search_fields = ('full_name', 'email', 'company_name')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('document_id', 'user_type', 'user_id', 'document_type', 'status', 'uploaded_at')
    list_filter = ('user_type', 'document_type', 'status')


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('message_id', 'name', 'email', 'created_at')
    search_fields = ('name', 'email')


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
