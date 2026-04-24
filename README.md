# Expense Tracker (Next.js + FastAPI)

Minimal full-stack expense tracker built for reliability under real-world conditions (slow networks, retries, refreshes).

## Stack
- Frontend: Next.js (App Router, TypeScript)
- Backend: FastAPI + SQLAlchemy
- Persistence: SQLite

## Why SQLite
SQLite is used for durable persistence with low operational complexity. It is enough for this assignment while still handling realistic page refresh/retry scenarios better than in-memory storage.

## Key Design Decisions
- Store `amount` as `Decimal` mapped to `NUMERIC(12,2)` to avoid float precision issues.
- Implement idempotency on `POST /expenses` via `Idempotency-Key` header:
  - Same key + same payload returns existing record (no duplicate expense).
  - Same key + different payload returns `409 Conflict`.
- Keep frontend resilient with:
  - in-flight submit protection
  - loading/error states
  - retry button that reuses the same idempotency key

## Trade-offs (Timebox)
- CORS is permissive (`*`) for simplicity; production should lock this down.
- Authentication/authorization is intentionally out of scope.
- No pagination for expense list due small feature scope.

## Intentional Omissions
- No user accounts / multi-tenant isolation
- No advanced observability/metrics
- No category summary chart (nice-to-have deferred)

## API

### `POST /expenses`
Create a new expense.

Body:
```json
{
  "amount": "499.50",
  "category": "Food",
  "description": "Lunch",
  "date": "2026-04-24"
}
```

Optional header:
- `Idempotency-Key: <uuid>`

### `GET /expenses`
List expenses.

Query params:
- `category=<string>`
- `sort=date_desc`

## Local Setup

### Backend
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Run app:
```bash
npm run dev
```

## Tests
```bash
cd backend
python -m pytest -q
```

## Deployment
- Frontend target: Vercel
- Backend target: Render

### Render (Backend)
- Create a new Web Service from this repository.
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Vercel (Frontend)
- Import this repo with root directory `frontend`
- Set env var:
  - `NEXT_PUBLIC_API_BASE_URL=<your_render_service_url>`

## Links
- Repository: <https://github.com/REDDIRANI1/fenmo-assignment>
- Live Frontend: _to be added after deployment_
- Live Backend: _to be added after deployment_
