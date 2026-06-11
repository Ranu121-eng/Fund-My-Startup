# Fund My Startup — Backend API Documentation

Django REST Framework backend for the existing HTML/CSS/JS frontend.

## Folder Structure

```
FundMyStartup/
├── frontend/                    # Existing UI (unchanged design)
│   └── js/
│       ├── script1.js           # Loads backend-api.js dynamically
│       └── backend-api.js       # Form → API integration
└── backend/
    ├── manage.py
    ├── requirements.txt
    ├── .env.example
    ├── fundmystartup/
    │   ├── __init__.py          # PyMySQL bootstrap
    │   ├── settings.py
    │   ├── urls.py
    │   ├── wsgi.py
    │   └── asgi.py
    └── core/
        ├── models.py
        ├── serializers.py
        ├── views.py
        ├── urls.py
        ├── admin.py
        ├── authentication.py
        ├── permissions.py
        ├── utils.py
        ├── migrations/
        └── management/commands/
            ├── seed_categories.py
            └── create_default_admin.py
```

## Setup Instructions

### 1. Create MySQL database

```sql
CREATE DATABASE fundmystartup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure environment

```bash
cd backend
copy .env.example .env
```

Edit `.env` with your MySQL credentials and a strong `SECRET_KEY`.

### 3. Install dependencies

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> **Python 3.14 note:** Use Django 5.2+ (included in `requirements.txt`). Older Django versions crash on `/admin/` with a `super object has no attribute 'dicts'` error.

### 4. Run migrations

```bash
python manage.py migrate
python manage.py seed_categories
python manage.py create_default_admin
```

Default admin credentials (change after first login):

- Email: `admin@fundmystartup.com`
- Password: `Admin@123`

### 5. Start the server

```bash
python manage.py runserver
```

API base URL: `http://127.0.0.1:8000/api/`

Media files: `http://127.0.0.1:8000/media/`

Django admin: `http://127.0.0.1:8000/admin/`

### 6. Serve the frontend

Open the `frontend/` folder with Live Server (VS Code) or any static server on port `5500` so CORS works with the default settings.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login/` | Public | Login (startup / investor / admin) |
| POST | `/api/register/startup/` | Public | Startup registration + file uploads |
| POST | `/api/register/investor/` | Public | Investor registration + file uploads |
| POST | `/api/contact/` | Public | Contact form submission |
| GET | `/api/categories/` | Public | List startup categories |
| GET | `/api/startups/` | Public | List approved startups |
| GET | `/api/dashboard/startup/` | Startup JWT | Startup dashboard data |
| GET | `/api/dashboard/investor/` | Investor JWT | Investor dashboard data |
| GET | `/api/dashboard/admin/` | Admin JWT | Admin overview |
| PATCH | `/api/admin/startups/{id}/approve/` | Admin JWT | Approve/reject startup |
| PATCH | `/api/admin/investors/{id}/approve/` | Admin JWT | Approve/reject investor |
| PATCH | `/api/admin/documents/{id}/approve/` | Admin JWT | Approve/reject document |
| GET/POST | `/api/funding-requests/` | JWT | List/create funding requests |
| GET/POST | `/api/investment-offers/` | JWT | List/create investment offers |
| PATCH | `/api/investment-offers/{id}/action/` | Startup JWT | Accept/reject offer |
| GET | `/api/investments/` | JWT | List investments |

**Authentication header:** `Authorization: Bearer <access_token>`

---

## Sample API Requests & Responses

### Login

**Request**

```http
POST /api/auth/login/
Content-Type: application/json

{
  "email": "founder@example.com",
  "password": "secret123",
  "user_type": "startup"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Login successful.",
  "user_type": "startup",
  "user_id": 1,
  "display_name": "Jane Doe",
  "email": "founder@example.com",
  "profile_status": "pending",
  "redirect_url": "/frontend/startup-dashboard.html",
  "tokens": {
    "access": "eyJ...",
    "refresh": "eyJ..."
  }
}
```

### Startup Registration

**Request**

```http
POST /api/register/startup/
Content-Type: multipart/form-data

founder_name=Jane Doe
email=founder@example.com
phone=9876543210
password=secret123
company_name=TechNova
website_url=https://technova.example
category_name=AI & ML
startup_description=AI-powered analytics platform
funding_range=5,00,000 - 10,00,000
country=India
state=Madhya Pradesh
district=Indore
aadhaar_card=<file>
pitch_deck=<file>
pan_card=<file>
```

**Response `201`**

```json
{
  "success": true,
  "message": "Startup registration submitted successfully. Status: Pending approval.",
  "startup_id": 1,
  "profile_status": "pending"
}
```

### Investor Registration

Same as startup but use `/api/register/investor/` with fields:

`full_name`, `email`, `phone`, `password`, `investor_type`, `investor_domain`, `company_name`, `investor_description`, `investment_range`, `country`, `state`, `district`, plus the three file fields.

### Contact Form

**Request**

```json
POST /api/contact/
{
  "name": "John Smith",
  "email": "john@example.com",
  "message": "I need help with registration."
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Message sent successfully!",
  "data": {
    "message_id": 1,
    "name": "John Smith",
    "email": "john@example.com",
    "message": "I need help with registration.",
    "created_at": "2026-06-11T10:30:00+05:30"
  }
}
```

### Admin Approve Startup

**Request**

```http
PATCH /api/admin/startups/1/approve/
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "profile_status": "approved"
}
```

### Create Investment Offer (Investor)

```json
POST /api/investment-offers/
Authorization: Bearer <investor_access_token>

{
  "startup_id": 1,
  "offer_amount": "500000.00"
}
```

### Accept Offer (Startup)

```json
PATCH /api/investment-offers/1/action/
Authorization: Bearer <startup_access_token>

{
  "action": "accepted"
}
```

---

## Connecting Frontend Forms (Already Wired)

Integration lives in `frontend/js/backend-api.js`, loaded automatically by `script1.js` without changing HTML or CSS.

| Page | Form ID | API Endpoint |
|------|---------|--------------|
| `startup-register.html` | `#startupForm` | `POST /api/register/startup/` |
| `investor-register.html` | `#startupForm` | `POST /api/register/investor/` |
| `login.html` | `#loginForm` | `POST /api/auth/login/` |
| `contact.html` | `#contactForm` | `POST /api/contact/` |

To point at a different server:

```html
<script>
  window.FUNDMYSTARTUP_API_BASE = 'https://your-domain.com/api';
</script>
```

(Add this only if you deploy to production; optional.)

After login, JWT tokens are stored in `localStorage`:

- `fms_access_token`
- `fms_refresh_token`
- `fms_user_type`
- `fms_user_id`

Dashboard pages can fetch live data:

```javascript
const token = localStorage.getItem('fms_access_token');
fetch('http://127.0.0.1:8000/api/dashboard/startup/', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

---

## Security Notes

- Passwords are hashed with Django’s `PBKDF2` hasher (`make_password` / `check_password`).
- JWT access tokens expire in 12 hours; refresh tokens in 7 days.
- Uploaded files are stored under `backend/media/documents/`.
- Allowed extensions: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.ppt`, `.pptx`.
- New registrations default to `profile_status = pending` until admin approval.

---

## Production Checklist

1. Set `DEBUG=False` in `.env`
2. Use a strong random `SECRET_KEY`
3. Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
4. Use HTTPS and a production WSGI server (gunicorn + nginx)
5. Change default admin password immediately
6. Back up MySQL and `media/` regularly
