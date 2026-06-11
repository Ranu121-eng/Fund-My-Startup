@echo off
cd /d "%~dp0"
echo Starting Fund My Startup backend...
echo.
if not exist ".env" (
    echo .env file not found. Run setup first:
    echo   python setup.py
    echo.
    pause
    exit /b 1
)
echo Installing/updating dependencies (Django 5.2+ required for Python 3.14)...
python -m pip install -r requirements.txt -q
echo.
python -c "import django; print('Django version:', django.__version__)"
echo.
echo Stop any OLD server first (Ctrl+C in other terminals), then starting...
python manage.py runserver 127.0.0.1:8000
pause
