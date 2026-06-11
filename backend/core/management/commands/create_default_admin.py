"""
Create a default platform admin account.
Run: python manage.py create_default_admin
"""

import os

from django.core.management.base import BaseCommand

from core.models import PlatformAdmin
from core.utils import hash_password


class Command(BaseCommand):
    help = 'Create default platform admin (email: admin@fundmystartup.com)'

    def handle(self, *args, **options):
        email = os.getenv('DEFAULT_ADMIN_EMAIL', 'admin@fundmystartup.com')
        password = os.getenv('DEFAULT_ADMIN_PASSWORD', 'Admin@123')
        name = os.getenv('DEFAULT_ADMIN_NAME', 'Platform Admin')

        admin, created = PlatformAdmin.objects.get_or_create(
            email=email,
            defaults={
                'name': name,
                'password': hash_password(password),
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'Admin created: {email} / {password}'))
        else:
            self.stdout.write(self.style.WARNING(f'Admin already exists: {email}'))
