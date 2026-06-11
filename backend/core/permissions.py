"""Role-based permissions for Fund My Startup API."""

from rest_framework.permissions import BasePermission


class IsStartupUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(getattr(user, 'is_authenticated', False) and user.user_type == 'startup')


class IsInvestorUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(getattr(user, 'is_authenticated', False) and user.user_type == 'investor')


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(getattr(user, 'is_authenticated', False) and user.user_type == 'admin')


class IsStartupOrInvestor(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            getattr(user, 'is_authenticated', False)
            and user.user_type in ('startup', 'investor')
        )
