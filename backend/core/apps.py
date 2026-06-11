import sys
from copy import copy as copy_obj

from django.apps import AppConfig


def _patch_django_context_for_python314():
    """
    Python 3.14 breaks BaseContext.__copy__ in Django < 5.2
    ('super' object has no attribute 'dicts').
    Apply the Django 5.2 fix when running on Python 3.14+.
    """
    if sys.version_info < (3, 14):
        return

    from django.template.context import BaseContext

    def fixed_basecontext_copy(self):
        duplicate = BaseContext()
        duplicate.__class__ = self.__class__
        duplicate.__dict__ = copy_obj(self.__dict__)
        duplicate.dicts = self.dicts[:]
        return duplicate

    BaseContext.__copy__ = fixed_basecontext_copy


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'Fund My Startup Core'

    def ready(self):
        _patch_django_context_for_python314()
