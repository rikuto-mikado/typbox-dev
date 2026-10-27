# TypBox Backend API (Django + DRF)

A robust backend boilerplate for the **TypBox Study Tracker & Portfolio Hub**.
Built with **Django**, **Django REST Framework (DRF)**, and **SimpleJWT** to provide secure authentication and persistent user-scoped study analytics.

---

## Architecture & Features

1. **User Authentication (JWT)**
   - User registration (`POST /api/auth/register/`)
   - Login & token issuance (`POST /api/auth/login/`)
   - Token refresh (`POST /api/auth/refresh/`)
   - Authenticated user profile (`GET /api/auth/me/`)
2. **Study Tracker Data Persistence (User-Scoped)**
   - Category CRUD (`/api/categories/`)
   - Study log CRUD (`/api/logs/`)
   - Automatically bootstraps 4 default study categories upon user signup
3. **Portfolio Hub Telemetry Aggregator**
   - Public aggregate endpoint (`GET /api/hub/telemetry/`)
   - Fully compatible with the React frontend's "Inspect Hub Payload" modal
4. **CORS & Environment Configurations**
   - Configured out-of-the-box for frontend local dev (`http://localhost:5173`)
   - Extensible configuration via `.env` file

---

## Local Development Setup

### 1. Create and Activate Virtual Environment

```bash
cd backend
python3 -m venv .venv

# On macOS / Linux:
source .venv/bin/activate

# On Windows:
# .venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Then set `SECRET_KEY` in `.env` (the server refuses to start without it). Generate one with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Every other variable has a working local default.

### 4. Run Migrations

```bash
python manage.py makemigrations tracker
python manage.py migrate
```

### 5. Create Superuser (Admin) (Optional)

```bash
python manage.py createsuperuser
```

### 6. Start Development Server

```bash
python manage.py runserver
```

- API Server: `http://127.0.0.1:8000/`
- Django Admin Portal: `http://127.0.0.1:8000/admin/`

---

## Production Deployment (Render)

1. **Create Managed PostgreSQL**:
   - In Render, create a new PostgreSQL database (e.g., `typbox-db`).
2. **Create Web Service**:
   - Connect this repository to a new Render Web Service.
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn typbox_hub.wsgi:application`
3. **Environment Variables on Render**:
   - `DATABASE_URL`: Set to Render's _Internal Database URL_.
   - `SECRET_KEY`: A secure random secret key.
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: `your-app-name.onrender.com`
   - `CORS_ALLOWED_ORIGINS`: `https://typbox.com` (your frontend production domain)
   - `CSRF_TRUSTED_ORIGINS`: `https://your-app-name.onrender.com`

---

## API Endpoints Reference

| Method                   | Path                    | Auth              | Description                                          |
| ------------------------ | ----------------------- | ----------------- | ---------------------------------------------------- |
| `POST`                   | `/api/auth/register/`   | Public            | Create new account (`username`, `email`, `password`) |
| `POST`                   | `/api/auth/login/`      | Public            | Authenticate (`access` & `refresh` JWT returned)     |
| `POST`                   | `/api/auth/refresh/`    | Public            | Refresh expired access token                         |
| `GET`                    | `/api/auth/me/`         | Bearer JWT        | Current user profile                                 |
| `DELETE`                 | `/api/auth/me/`         | Bearer JWT        | Permanently delete account and all data              |
| `GET` / `POST`           | `/api/categories/`      | Bearer JWT        | List / Create categories                             |
| `GET` / `PUT` / `DELETE` | `/api/categories/<id>/` | Bearer JWT        | Retrieve / Update / Delete category                  |
| `GET` / `POST`           | `/api/logs/`            | Bearer JWT        | List / Create study logs                             |
| `GET` / `PUT` / `DELETE` | `/api/logs/<id>/`       | Bearer JWT        | Retrieve / Update / Delete log                       |
| `GET`                    | `/api/hub/telemetry/`   | Public / Optional | Telemetry summary payload for portfolio hub          |
