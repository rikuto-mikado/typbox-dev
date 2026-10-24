# TypBox

A study tracker and portfolio hub. Log study sessions, review analytics, and share your progress.

## Features

- Session logging with a live chronometer and command palette (⌘K / Ctrl+K)
- Categories, analytics, and study insights
- Rank and unlock progression
- Personalization: surface themes, chronometer faces, and UI fonts
- Weather, ambient noise, and ambient overlays for focus
- Shareable status cards

See [`design/FEATURES.md`](./design/FEATURES.md) for the full list.

## Tech Stack

| Part     | Stack                                       |
| -------- | ------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend  | Django, Django REST Framework, SimpleJWT    |
| Database | SQLite (local), PostgreSQL (production)     |
| Hosting  | Render                                      |

## Project Structure

```
typbox-dev/
├── frontend/   # React client
├── backend/    # Django REST API
└── design/     # Design docs and tokens
```

## Getting Started

Run the backend and frontend in separate terminals.

```bash
# Backend: http://localhost:8000
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

```bash
# Frontend: http://localhost:5173
cd frontend
npm install
npm run dev
```

For details, see [`frontend/README.md`](./frontend/README.md) and [`backend/README.md`](./backend/README.md).

## License

[MIT](./LICENSE)
