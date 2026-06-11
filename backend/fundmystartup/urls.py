"""URL configuration for Fund My Startup project."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Serve existing frontend from Django so one server URL works (no HTML/CSS changes).
    urlpatterns += [
        re_path(
            r'^frontend/(?P<path>.*)$',
            serve,
            {'document_root': settings.FRONTEND_ROOT},
        ),
        path(
            '',
            serve,
            {'document_root': settings.FRONTEND_ROOT, 'path': 'index.html'},
        ),
    ]
