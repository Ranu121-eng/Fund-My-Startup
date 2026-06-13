"""
Database models for Fund My Startup.
Schema mirrors the provided MySQL DDL (startup_categories, startups, investors, etc.).
"""

from django.db import models


class ProfileStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class UserType(models.TextChoices):
    STARTUP = 'startup', 'Startup'
    INVESTOR = 'investor', 'Investor'


class DocumentType(models.TextChoices):
    AADHAAR = 'aadhaar', 'Aadhaar'
    PAN = 'pan', 'PAN'
    PITCH_DECK = 'pitch_deck', 'Pitch Deck'


class DocumentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class FundingRequestStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    FUNDED = 'funded', 'Funded'
    CLOSED = 'closed', 'Closed'


class OfferStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    ACCEPTED = 'accepted', 'Accepted'
    REJECTED = 'rejected', 'Rejected'


class StartupCategory(models.Model):
    """Startup domain/category lookup table."""

    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'startup_categories'
        verbose_name_plural = 'Startup categories'

    def __str__(self):
        return self.category_name


class Startup(models.Model):
    """Registered startup founder account."""

    startup_id = models.AutoField(primary_key=True)
    founder_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100, unique=True)
    phone = models.CharField(max_length=15)
    password = models.CharField(max_length=255)
    company_name = models.CharField(max_length=150)
    website_url = models.URLField(max_length=255, blank=True, null=True)
    startup_description = models.TextField(blank=True, null=True)
    funding_required = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    category = models.ForeignKey(
        StartupCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='category_id',
        related_name='startups',
    )
    profile_status = models.CharField(
        max_length=20,
        choices=ProfileStatus.choices,
        default=ProfileStatus.PENDING,
    )
    is_email_verified = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True, null=True)
    is_two_factor_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'startups'

    def __str__(self):
        return f'{self.company_name} ({self.email})'


class Investor(models.Model):
    """Registered investor account."""

    investor_id = models.AutoField(primary_key=True)
    full_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100, unique=True)
    phone = models.CharField(max_length=15)
    password = models.CharField(max_length=255)
    investor_type = models.CharField(max_length=100, blank=True, null=True)
    investor_domain = models.CharField(max_length=100, blank=True, null=True)
    company_name = models.CharField(max_length=150, blank=True, null=True)
    investor_description = models.TextField(blank=True, null=True)
    max_investment_range = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    profile_status = models.CharField(
        max_length=20,
        choices=ProfileStatus.choices,
        default=ProfileStatus.PENDING,
    )
    is_email_verified = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True, null=True)
    is_two_factor_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investors'

    def __str__(self):
        return f'{self.full_name} ({self.email})'


def document_upload_path(instance, filename):
    """Store uploads under media/documents/{user_type}/{user_id}/{doc_type}/."""
    return f'documents/{instance.user_type}/{instance.user_id}/{instance.document_type}/{filename}'


class Document(models.Model):
    """KYC and pitch deck uploads for startups and investors."""

    document_id = models.AutoField(primary_key=True)
    user_type = models.CharField(max_length=20, choices=UserType.choices)
    user_id = models.IntegerField()
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    file_path = models.FileField(upload_to=document_upload_path, max_length=255)
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING,
    )
    remarks = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documents'

    def __str__(self):
        return f'{self.user_type}:{self.user_id} - {self.document_type}'


class ContactMessage(models.Model):
    """Messages submitted via the Contact Us form."""

    message_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contact_messages'

    def __str__(self):
        return f'{self.name} - {self.email}'


class FundingRequest(models.Model):
    """Funding request raised by a startup."""

    request_id = models.AutoField(primary_key=True)
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        db_column='startup_id',
        related_name='funding_requests',
    )
    requested_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=FundingRequestStatus.choices,
        default=FundingRequestStatus.OPEN,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'funding_requests'

    def __str__(self):
        return f'Request #{self.request_id} - {self.startup.company_name}'


class InvestmentOffer(models.Model):
    """Investment offer made by an investor to a startup."""

    offer_id = models.AutoField(primary_key=True)
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        db_column='startup_id',
        related_name='investment_offers',
    )
    investor = models.ForeignKey(
        Investor,
        on_delete=models.CASCADE,
        db_column='investor_id',
        related_name='investment_offers',
    )
    offer_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=OfferStatus.choices,
        default=OfferStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investment_offers'

    def __str__(self):
        return f'Offer #{self.offer_id} - ₹{self.offer_amount}'


class Investment(models.Model):
    """Completed investment record."""

    investment_id = models.AutoField(primary_key=True)
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        db_column='startup_id',
        related_name='investments',
    )
    investor = models.ForeignKey(
        Investor,
        on_delete=models.CASCADE,
        db_column='investor_id',
        related_name='investments',
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    funded_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investments'

    def __str__(self):
        return f'Investment #{self.investment_id} - ₹{self.amount}'


class PlatformAdmin(models.Model):
    """Platform administrator account (maps to admin table)."""

    admin_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100, unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admin'
        verbose_name = 'Platform admin'
        verbose_name_plural = 'Platform admins'

    def __str__(self):
        return f'{self.name} ({self.email})'


class PasswordResetToken(models.Model):
    """Token for resetting user passwords securely."""

    token_id = models.AutoField(primary_key=True)
    email = models.EmailField(max_length=100)
    user_type = models.CharField(
        max_length=20,
        choices=[('startup', 'Startup'), ('investor', 'Investor'), ('admin', 'Admin')],
    )
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'password_reset_tokens'

    def __str__(self):
        return f'{self.email} ({self.user_type}) - {self.token[:8]}'


class EmailVerificationToken(models.Model):
    """Token for email verification on registration."""

    token_id = models.AutoField(primary_key=True)
    email = models.EmailField(max_length=100)
    user_type = models.CharField(
        max_length=20,
        choices=[('startup', 'Startup'), ('investor', 'Investor')],
    )
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'email_verification_tokens'

    def __str__(self):
        return f'{self.email} ({self.user_type}) - {self.token[:8]}'


class Message(models.Model):
    """Real-time chat messages between Startup and Investor."""

    message_id = models.AutoField(primary_key=True)
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        db_column='startup_id',
        related_name='messages',
    )
    investor = models.ForeignKey(
        Investor,
        on_delete=models.CASCADE,
        db_column='investor_id',
        related_name='messages',
    )
    sender_type = models.CharField(
        max_length=10,
        choices=[('startup', 'Startup'), ('investor', 'Investor')],
    )
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return f'Message #{self.message_id}: {self.sender_type} -> {self.content[:20]}'


class Meeting(models.Model):
    """Scheduled meeting records between Startup and Investor."""

    class MeetingStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'

    meeting_id = models.AutoField(primary_key=True)
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        db_column='startup_id',
        related_name='meetings',
    )
    investor = models.ForeignKey(
        Investor,
        on_delete=models.CASCADE,
        db_column='investor_id',
        related_name='meetings',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    scheduled_time = models.DateTimeField()
    location_or_link = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=MeetingStatus.choices,
        default=MeetingStatus.PENDING,
    )
    created_by_type = models.CharField(
        max_length=10,
        choices=[('startup', 'Startup'), ('investor', 'Investor')],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'meetings'
        ordering = ['-scheduled_time']

    def __str__(self):
        return f'Meeting #{self.meeting_id}: {self.title} ({self.status})'


class SavedStartup(models.Model):
    """Investor saved/favorited startups."""

    saved_id = models.AutoField(primary_key=True)
    investor = models.ForeignKey(
        Investor,
        on_delete=models.CASCADE,
        db_column='investor_id',
        related_name='saved_startups',
    )
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        db_column='startup_id',
        related_name='saved_by_investors',
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_startups'
        unique_together = ('investor', 'startup')

    def __str__(self):
        return f'{self.investor.full_name} saved {self.startup.company_name}'


class Notification(models.Model):
    """In-app notifications for users."""

    notification_id = models.AutoField(primary_key=True)
    user_type = models.CharField(
        max_length=20,
        choices=[('startup', 'Startup'), ('investor', 'Investor'), ('admin', 'Admin')],
    )
    user_id = models.IntegerField()
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'Notification #{self.notification_id} for {self.user_type}:{self.user_id}'


