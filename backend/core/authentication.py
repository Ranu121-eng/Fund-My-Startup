"""
Custom JWT authentication for startup, investor, and admin users.
Tokens carry user_type and user_id claims instead of Django User model.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Investor, PlatformAdmin, Startup


class AuthenticatedAccount:
    """Lightweight user object attached to request.user after JWT validation."""

    def __init__(self, user_type, user_id, email, display_name, profile_status=None):
        self.user_type = user_type
        self.user_id = user_id
        self.email = email
        self.display_name = display_name
        self.profile_status = profile_status
        self.is_authenticated = True

    @property
    def pk(self):
        return self.user_id


def build_tokens(user_type, user_id, email):
    """Create access/refresh JWT pair with custom claims."""
    refresh = RefreshToken()
    refresh['user_type'] = user_type
    refresh['user_id'] = user_id
    refresh['email'] = email
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def resolve_account(user_type, user_id):
    """Load account details from the appropriate table."""
    if user_type == 'startup':
        startup = Startup.objects.get(startup_id=user_id)
        return AuthenticatedAccount(
            user_type='startup',
            user_id=startup.startup_id,
            email=startup.email,
            display_name=startup.founder_name,
            profile_status=startup.profile_status,
        )
    if user_type == 'investor':
        investor = Investor.objects.get(investor_id=user_id)
        return AuthenticatedAccount(
            user_type='investor',
            user_id=investor.investor_id,
            email=investor.email,
            display_name=investor.full_name,
            profile_status=investor.profile_status,
        )
    if user_type == 'admin':
        admin = PlatformAdmin.objects.get(admin_id=user_id)
        return AuthenticatedAccount(
            user_type='admin',
            user_id=admin.admin_id,
            email=admin.email,
            display_name=admin.name,
        )
    raise InvalidToken('Unknown user type in token.')


class CustomJWTAuthentication(JWTAuthentication):
    """Validate JWT and attach AuthenticatedAccount to request.user."""

    def get_user(self, validated_token):
        try:
            user_type = validated_token['user_type']
            user_id = validated_token['user_id']
        except KeyError as exc:
            raise InvalidToken('Token missing required claims.') from exc

        try:
            return resolve_account(user_type, user_id)
        except (Startup.DoesNotExist, Investor.DoesNotExist, PlatformAdmin.DoesNotExist) as exc:
            raise InvalidToken('User account not found.') from exc
