"""Quick check: Django version and Python 3.14 admin compatibility."""
import sys

import django

print(f'Python: {sys.version}')
print(f'Django: {django.__version__}')
print(f'Django path: {django.__file__}')

if sys.version_info >= (3, 14):
    major, minor = django.VERSION[:2]
    if major < 5 or (major == 5 and minor < 2):
        print('WARNING: Python 3.14 requires Django 5.2+. Run: pip install -r requirements.txt')
    else:
        print('OK: Django version supports Python 3.14.')
