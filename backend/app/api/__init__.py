from fastapi import APIRouter

from app.api import cameras, sightings, analytics, alerts, blacklist, detect, reports, auth, websocket

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(cameras.router)
api_router.include_router(sightings.router)
api_router.include_router(sightings.trajectory_router)
api_router.include_router(analytics.router)
api_router.include_router(alerts.router)
api_router.include_router(blacklist.router)
api_router.include_router(detect.router)
api_router.include_router(reports.router)
api_router.include_router(websocket.router)