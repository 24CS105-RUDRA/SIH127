# ANPR Traffic Analytics Platform

City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics

## Overview

This platform provides a complete solution for city-wide Automatic Number Plate Recognition (ANPR) and traffic analytics, featuring:

- **High-Accuracy ANPR/OCR**: YOLOv8 + PaddleOCR with >90% accuracy target
- **Trajectory Reconstruction**: Track vehicles across 12+ cameras with fuzzy matching
- **Real-time Analytics**: Density, O-D matrix, congestion, heatmaps
- **Alert System**: Blacklist matching + anomaly detection
- **Modern Dashboard**: React + Leaflet/Mapbox with WebSocket updates

## Architecture

```
[Simulator/Cameras] → [ML Service: YOLOv8+PaddleOCR] → [Backend API: FastAPI] → [PostgreSQL+TimescaleDB+Redis]
                                                                                   ↓
                                            [Frontend: React+Leaflet+Deck.gl] ← [WebSocket]
```

## Quick Start

```bash
# Clone and navigate
cd anpr-traffic-analytics

# Start all services
./start.sh
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend Dashboard | http://localhost:5173 | admin@example.com / admin123 |
| Backend API | http://localhost:8000 | - |
| API Docs (Swagger) | http://localhost:8000/docs | - |
| ML Service | http://localhost:8001 | - |
| ML Service Docs | http://localhost:8001/docs | - |

## Services

### Backend (FastAPI)
- **Port**: 8000
- **Tech**: Python 3.11, FastAPI, SQLAlchemy 2.0, PostgreSQL+TimescaleDB, Redis
- **Features**: REST API, WebSocket, JWT Auth, Role-based Access

### ML Service (Inference)
- **Port**: 8001
- **Tech**: YOLOv8 (Ultralytics), PaddleOCR, OpenCV
- **Endpoints**: `/detect`, `/detect/batch`, `/detect/upload`

### Frontend (React)
- **Port**: 3000
- **Tech**: React 18, Vite, Tailwind CSS, Leaflet, Deck.gl, Recharts, TanStack Query
- **Features**: Real-time maps, charts, trajectory playback

### Database
- **PostgreSQL 16** + **PostGIS** + **TimescaleDB**
- **Redis 7** for caching, streams, WebSocket pub/sub

### Simulator
- Generates synthetic traffic across 12 virtual cameras
- Realistic paths through camera network
- Triggers blacklist alerts and anomalies

## Project Structure

```
anpr-traffic-analytics/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Config, security
│   │   ├── db/             # Database setup
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   └── Dockerfile
├── ml-service/             # ML inference service
│   ├── app/
│   └── Dockerfile
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API clients
│   │   ├── hooks/          # Custom hooks
│   │   ├── store/          # Zustand stores
│   │   └── lib/            # Utilities
│   └── Dockerfile
├── simulator/              # Traffic simulator
│   ├── simulate_traffic.py
│   └── seed/               # Demo data
├── docker/                 # DB init scripts
├── docker-compose.yml
└── start.sh
```

## API Endpoints

### Cameras
- `GET /api/v1/cameras` - List cameras
- `POST /api/v1/cameras` - Create camera
- `GET /api/v1/cameras/{id}` - Get camera with metrics
- `PATCH /api/v1/cameras/{id}` - Update camera

### Sightings
- `POST /api/v1/sightings` - Ingest sighting
- `POST /api/v1/sightings/batch` - Batch ingest
- `GET /api/v1/sightings` - List sightings

### Trajectory
- `GET /api/v1/trajectory/{plate}` - Get vehicle trajectory
- `GET /api/v1/trajectory/search/{query}` - Fuzzy plate search

### Analytics
- `GET /api/v1/analytics/kpis` - Dashboard KPIs
- `GET /api/v1/analytics/density` - Traffic density
- `GET /api/v1/analytics/od-matrix` - Origin-Destination matrix
- `GET /api/v1/analytics/congestion` - Congestion data
- `GET /api/v1/analytics/heatmap` - H3 heatmap
- `GET /api/v1/analytics/speed` - Segment speeds

### Alerts
- `GET /api/v1/alerts` - List alerts
- `POST /api/v1/alerts/{id}/acknowledge` - Acknowledge
- `POST /api/v1/alerts/{id}/resolve` - Resolve

### Blacklist
- `GET /api/v1/blacklist` - List blacklist
- `POST /api/v1/blacklist` - Add plate
- `POST /api/v1/blacklist/import` - Bulk import

### Detection
- `POST /api/v1/detect` - Detect from upload
- `POST /api/v1/detect/base64` - Detect from base64
- `POST /api/v1/detect/batch` - Batch detection

### WebSocket
- `WS /api/v1/ws/alerts` - Real-time alerts
- `WS /api/v1/ws/heatmap` - Real-time heatmap
- `WS /api/v1/ws/density` - Real-time density

## Configuration

### Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
REDIS_URL=redis://host:6379
ML_SERVICE_URL=http://ml-service:8001
SECRET_KEY=your-secret-key
```

**ML Service** (`ml-service/.env`):
```env
YOLO_MODEL_PATH=/app/weights/yolov8n.pt
DEVICE=cpu  # or cuda:0
CONFIDENCE_THRESHOLD=0.5
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_MAPBOX_TOKEN=your-token
```

## Demo Data

The system comes pre-loaded with:
- 12 cameras across 6 zones (Ahmedabad/Anand area)
- 80+ demo license plates (Indian format)
- 4 blacklisted plates for alert testing
- 1 admin user (admin@example.com / admin123)

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### ML Service Development
```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Run Tests
```bash
cd backend
pytest
```

## Production Deployment

1. Update `.env` files with production values
2. Use proper secrets management
3. Enable HTTPS with reverse proxy (nginx/traefik)
4. Configure PostgreSQL connection pooling
5. Set up monitoring (Prometheus + Grafana)
6. Use Kubernetes manifests for orchestration

## License

Proprietary - Bharat Electronics Limited (BEL)

## Problem Statement

**ID**: 26127  
**Organization**: Bharat Electronics Limited  
**Theme**: Smart Automation