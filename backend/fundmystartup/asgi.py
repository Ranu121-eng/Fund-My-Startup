"""ASGI config for Fund My Startup project."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fundmystartup.settings')

application = get_asgi_application()
