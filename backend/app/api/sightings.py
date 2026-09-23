from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from app.db.database import get_db
from app.services.trajectory import TrajectoryService
from app.services.ingestion import IngestionService
from app.schemas.sighting import (
    SightingCreate, SightingBatchCreate, SightingResponse, 
    SightingListResponse, TrajectoryResponse
)

router = APIRouter(prefix="/sightings", tags=["sightings"])


@router.post("", response_model=SightingResponse, status_code=201)
async def create_sighting(
    sighting_data: SightingCreate,
    db: AsyncSession = Depends(get_db)
):
    service = IngestionService(db)
    sighting = await service.ingest_sighting(sighting_data)
    return SightingResponse.model_validate(sighting)


@router.post("/batch", response_model=List[SightingResponse], status_code=201)
async def create_sightings_batch(
    batch_data: SightingBatchCreate,
    db: AsyncSession = Depends(get_db)
):
    service = IngestionService(db)
    sightings = await service.ingest_batch(batch_data.sightings)
    return [SightingResponse.model_validate(s) for s in sightings]


@router.get("", response_model=SightingListResponse)
async def list_sightings(
    camera_id: Optional[str] = Query(None),
    plate_text: Optional[str] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    from app.models.sighting import PlateSighting
    from sqlalchemy import select, func
    from app.services.plate_utils import normalize_plate
    
    query = select(PlateSighting).order_by(PlateSighting.ts.desc())
    
    if camera_id:
        query = query.where(PlateSighting.camera_id == camera_id)
    if plate_text:
        query = query.where(PlateSighting.normalized_plate == normalize_plate(plate_text))
    if start_time:
        query = query.where(PlateSighting.ts >= start_time)
    if end_time:
        query = query.where(PlateSighting.ts <= end_time)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    sightings = result.scalars().all()
    
    return SightingListResponse(
        sightings=[SightingResponse.model_validate(s) for s in sightings],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/recent", response_model=List[SightingResponse])
async def get_recent_sightings(
    camera_id: Optional[str] = Query(None),
    plate_text: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    service = IngestionService(db)
    sightings = await service.get_recent_sightings(camera_id, plate_text, limit)
    return [SightingResponse.model_validate(s) for s in sightings]


# Trajectory endpoints
trajectory_router = APIRouter(prefix="/trajectory", tags=["trajectory"])


@trajectory_router.get("/{plate}", response_model=TrajectoryResponse)
async def get_trajectory(
    plate: str,
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    camera_zone: Optional[str] = Query(None),
    confidence_threshold: float = Query(0.0, ge=0.0, le=1.0),
    fuzzy_threshold: int = Query(1, ge=0, le=3),
    db: AsyncSession = Depends(get_db)
):
    service = TrajectoryService(db)
    return await service.get_trajectory(
        plate=plate,
        start_time=start_time,
        end_time=end_time,
        camera_zone=camera_zone,
        confidence_threshold=confidence_threshold,
        fuzzy_threshold=fuzzy_threshold
    )


@trajectory_router.get("/search/{query}", response_model=List[dict])
async def search_plates(
    query: str,
    limit: int = Query(10, ge=1, le=50),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    service = TrajectoryService(db)
    return await service.search_plates(query, limit, start_time, end_time)