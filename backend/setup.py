"""
One-time setup script for Fund My Startup backend.
Creates .env, database, runs migrations, and creates admin accounts.

Usage:
    cd backend
    python setup.py
"""

import getpass
import os
import subprocess
import sys
from pathlib import Path

import pymysql

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / '.env'


def run_command(args, env=None):
    """Run a manage.py command."""
    cmd = [sys.executable, str(BASE_DIR / 'manage.py'), *args]
    subprocess.run(cmd, cwd=BASE_DIR, env=env, check=True)


def write_env(mysql_password, secret_key='dev-secret-key-change-in-production'):
    """Write .env file with MySQL credentials."""
    content = f"""DEBUG=True
SECRET_KEY={secret_key}
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=fundmystartup
DB_USER=root
DB_PASSWORD={mysql_password}
DB_HOST=127.0.0.1
DB_PORT=3306

CORS_ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8000,http://localhost:8000

DEFAULT_ADMIN_EMAIL=admin@fundmystartup.com
DEFAULT_ADMIN_PASSWORD=Admin@123
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@fundmystartup.com
DJANGO_SUPERUSER_PASSWORD=Admin@123
"""
    ENV_PATH.write_text(content, encoding='utf-8')
    print(f'Created {ENV_PATH}')


def create_database(password):
    """Create MySQL database if it does not exist."""
    connection = pymysql.connect(
        host='127.0.0.1',
        user='root',
        password=password,
        port=3306,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'CREATE DATABASE IF NOT EXISTS fundmystartup '
                'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
            )
        connection.commit()
        print('Database fundmystartup is ready.')
    finally:
        connection.close()


def main():
    print('=' * 60)
    print('Fund My Startup - Backend Setup')
    print('=' * 60)

    if ENV_PATH.exists():
        print(f'.env already exists at {ENV_PATH}')
        overwrite = input('Overwrite .env? (y/N): ').strip().lower()
        if overwrite != 'y':
            password = os.getenv('DB_PASSWORD', '')
            if not password:
                from dotenv import load_dotenv
                load_dotenv(ENV_PATH)
                password = os.getenv('DB_PASSWORD', '')
        else:
            password = getpass.getpass('Enter MySQL root password: ')
            write_env(password)
    else:
        password = getpass.getpass('Enter MySQL root password: ')
        write_env(password)

    if not password:
        from dotenv import load_dotenv
        load_dotenv(ENV_PATH)
        password = os.getenv('DB_PASSWORD', '')

    if not password:
        print('ERROR: MySQL password is required.')
        sys.exit(1)

    os.environ['DB_PASSWORD'] = password
    from dotenv import load_dotenv
    load_dotenv(ENV_PATH, override=True)

    try:
        create_database(password)
    except pymysql.err.OperationalError as exc:
        print(f'ERROR: Could not connect to MySQL: {exc}')
        print('Check that MySQL is running and the password is correct.')
        sys.exit(1)

    print('Running migrations...')
    run_command(['migrate'])

    print('Seeding categories...')
    run_command(['seed_categories'])

    print('Creating platform admin (API admin)...')
    run_command(['create_default_admin'])

    print('Creating Django superuser (for /admin/ page)...')
    env = os.environ.copy()
    env['DJANGO_SUPERUSER_PASSWORD'] = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'Admin@123')
    try:
        run_command(
            [
                'createsuperuser',
                '--noinput',
                '--username',
                os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin'),
                '--email',
                os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@fundmystartup.com'),
            ],
            env=env,
        )
    except subprocess.CalledProcessError:
        print('Django superuser already exists (skipped).')

    print()
    print('Setup complete!')
    print()
    print('Start the server:')
    print('  python manage.py runserver')
    print()
    print('Open in browser:')
    print('  Frontend: http://127.0.0.1:8000/frontend/index.html')
    print('  Django Admin: http://127.0.0.1:8000/admin/')
    print('  API: http://127.0.0.1:8000/api/')
    print()
    print('Django Admin login:')
    print('  Username: admin')
    print('  Password: Admin@123')
    print()
    print('API Platform Admin login (via login page API):')
    print('  Email: admin@fundmystartup.com')
    print('  Password: Admin@123')
    print('  user_type: admin')


if __name__ == '__main__':
    main()
