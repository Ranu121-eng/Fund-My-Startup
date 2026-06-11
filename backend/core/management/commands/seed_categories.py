"""
Seed startup categories matching the frontend dropdown options.
Run: python manage.py seed_categories
"""

from django.core.management.base import BaseCommand

from core.models import StartupCategory

DEFAULT_CATEGORIES = [
    ('Health Tech', 'Healthcare and medical technology startups.'),
    ('EdTech', 'Education and learning technology startups.'),
    ('FinTech', 'Financial services and payment technology startups.'),
    ('AI & ML', 'Artificial intelligence and machine learning startups.'),
    ('E-Commerce', 'Online retail and marketplace startups.'),
    ('Food Tech', 'Food delivery and restaurant technology startups.'),
]


class Command(BaseCommand):
    help = 'Seed default startup categories'

    def handle(self, *args, **options):
        created_count = 0
        for name, description in DEFAULT_CATEGORIES:
            _, created = StartupCategory.objects.get_or_create(
                category_name=name,
                defaults={'description': description},
            )
            if created:
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f'Seed complete. {created_count} new categories added.'))
