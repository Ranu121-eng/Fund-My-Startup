"""WSGI config for Fund My Startup project."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fundmystartup.settings')

application = get_wsgi_application()
