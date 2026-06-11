# Fund My Startup — Run the Complete Project

## 1. One-time setup

```bash
cd backend
python setup.py
```

Enter your MySQL root password when prompted.

## 2. Start the server

```bash
cd backend
python manage.py runserver
```

Or double-click `backend/run_server.bat`

## 3. Open the app

| URL | Description |
|-----|-------------|
| http://127.0.0.1:8000/frontend/index.html | Home |
| http://127.0.0.1:8000/frontend/login.html | Login |
| http://127.0.0.1:8000/frontend/startup-register.html | Register startup |
| http://127.0.0.1:8000/frontend/investor-register.html | Register investor |
| http://127.0.0.1:8000/frontend/startup-dashboard.html | Startup dashboard |
| http://127.0.0.1:8000/frontend/investor-dashboard.html | Investor dashboard |
| http://127.0.0.1:8000/frontend/admin-dashboard.html | Platform admin dashboard |
| http://127.0.0.1:8000/admin/ | Django admin (database management) |

## 4. Default accounts

**Platform API Admin** (login page → Admin):
- Email: `admin@fundmystartup.com`
- Password: `Admin@123`

**Django Admin** (http://127.0.0.1:8000/admin/):
- Username: `admin`
- Password: `Admin@123`

## 5. Full workflow test

1. Register a startup (upload Aadhaar, PAN, pitch deck)
2. Register an investor
3. Login as Admin → approve both on admin dashboard
4. Login as investor → make investment offer on a startup
5. Login as startup → accept offer on dashboard
6. View approved startups on `startup.html`

## Requirements

- Python 3.12+ (3.14 supported with Django 5.2+)
- MySQL 8.0 running
- Dependencies: `pip install -r backend/requirements.txt`
