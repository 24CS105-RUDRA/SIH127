from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from app.db.database import get_db
from app.services.cameras import CameraService
from app.schemas.camera import (
    CameraCreate, CameraUpdate, CameraResponse, 
    CameraWithMetrics, CameraListResponse
)

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.post("", response_model=CameraResponse, status_code=201)
async def create_camera(
    camera_data: CameraCreate,
    db: AsyncSession = Depends(get_db)
):
    service = CameraService(db)
    camera = await service.create_camera(camera_data)
    return CameraResponse.model_validate(camera)


@router.get("", response_model=CameraListResponse)
async def list_cameras(
    zone: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    service = CameraService(db)
    cameras, total = await service.get_cameras(zone, status, page, page_size)
    return CameraListResponse(
        cameras=cameras,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/zones", response_model=List[str])
async def get_zones(db: AsyncSession = Depends(get_db)):
    service = CameraService(db)
    return await service.get_all_zones()


@router.get("/locations", response_model=List[dict])
async def get_camera_locations(db: AsyncSession = Depends(get_db)):
    service = CameraService(db)
    return await service.get_camera_locations()


@router.get("/{camera_id}", response_model=CameraWithMetrics)
async def get_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db)
):
    service = CameraService(db)
    camera = await service.get_camera_with_metrics(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: str,
    update_data: CameraUpdate,
    db: AsyncSession = Depends(get_db)
):
    service = CameraService(db)
    camera = await service.update_camera(camera_id, update_data)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return CameraResponse.model_validate(camera)


@router.delete("/{camera_id}", status_code=204)
async def delete_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db)
):
    service = CameraService(db)
    success = await service.delete_camera(camera_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camera not found")