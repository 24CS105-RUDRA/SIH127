# ANPR Traffic Analytics — Quick Start (Native)

## Prerequisites
- Python 3.11+
- PostgreSQL 16+ (running on localhost:5432)
- Redis 7+ (running on localhost:6379)
- Node.js 20+
- Python 3.11+

## Quick Start (Native)

```bash
# 1. Start PostgreSQL & Redis
brew services start postgresql@16 redis   # macOS
# or: systemctl start postgresql redis   # Linux

# 2. Create database
createdb anpr_db
psql -d anpr_db -f docker/init-db-simple.sql

# 3. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env if needed (ALLOWED_ORIGINS already includes http://localhost:5173)
uvicorn app.main:app --host 127.0.0.1 --port 8000

# 4. Frontend (separate terminal)
cd ../frontend
npm install
npm run dev
# Opens at http://localhost:5173

# 5. Login
Email:    admin@example.com
Password: admin123
```

## Docker (Optional)
```bash
# Requires docker-compose and working Docker daemon
docker-compose up --build
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs
```

## Default Credentials
| Role        | Email                | Password |
|-------------|----------------------|----------|
| Admin       | admin@example.com    | admin123 |

## Ports
| Service   | Native | Docker |
|-----------|--------|--------|
| Frontend  | 5173   | 3000   |
| Backend   | 8000   | 8000   |
| API Docs  | 8000/docs | 8000/docs |

## Default Ports
- Frontend (Vite): 5173
- Backend (FastAPI): 8000
- API Docs: http://localhost:8000/docs

## Default Credentials
| Role    | Email                | Password   |
|---------|----------------------|------------|
| Admin   | admin@example.com    | admin123   |

## Architecture
- **Backend**: FastAPI + SQLAlchemy 2.0 + PostgreSQL 16 + Redis
- **Frontend**: React 18 + Vite + Tailwind CSS + Leaflet + Recharts
- **Simulator**: Native Python script generating synthetic ANPR events

## Key Endpoints
| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| POST   | /api/v1/auth/login            | Login, returns JWT |
| GET    | /api/v1/auth/me               | Current user |
| GET    | /api/v1/analytics/kpis        | Dashboard KPIs |
| GET    | /api/v1/analytics/heatmap     | Heatmap data |
| GET    | /api/v1/analytics/speed       | Segment speeds |
| GET    | /api/v1/cameras/locations     | Camera map pins |
| WS     | /api/v1/ws/alerts             | Real-time alerts |

## Troubleshooting
- **CORS errors**: Ensure `backend/.env` has `ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173","http://127.0.0.1:5173"]`
- **DB connection**: Verify PostgreSQL is running and `anpr_db` exists
- **Redis**: `redis-cli ping` should return `PONG`
- **Frontend blank**: Ensure `VITE_API_URL=http://localhost:8000` in `frontend/.env`
