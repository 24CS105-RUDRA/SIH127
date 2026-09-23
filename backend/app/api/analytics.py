from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
from app.db.database import get_db
from app.services.analytics import AnalyticsService
from app.schemas.analytics import (
    AnalyticsQuery, TimeRange,
    DensityResponse, ODMatrixResponse, CongestionResponse,
    HeatmapResponse, SpeedResponse, KPIResponse
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis(db: AsyncSession = Depends(get_db)):
    service = AnalyticsService(db)
    return await service.get_kpis()


@router.get("/density", response_model=DensityResponse)
async def get_density(
    time_range: TimeRange = Query(TimeRange.ONE_HOUR),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    zone: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = AnalyticsQuery(
        time_range=time_range,
        start_time=start_time,
        end_time=end_time,
        zone=zone,
        camera_id=camera_id
    )
    service = AnalyticsService(db)
    return await service.get_density(query)


@router.get("/od-matrix", response_model=ODMatrixResponse)
async def get_od_matrix(
    time_range: TimeRange = Query(TimeRange.ONE_HOUR),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    zone: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = AnalyticsQuery(
        time_range=time_range,
        start_time=start_time,
        end_time=end_time,
        zone=zone
    )
    service = AnalyticsService(db)
    return await service.get_od_matrix(query)


@router.get("/congestion", response_model=CongestionResponse)
async def get_congestion(
    time_range: TimeRange = Query(TimeRange.ONE_HOUR),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    zone: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = AnalyticsQuery(
        time_range=time_range,
        start_time=start_time,
        end_time=end_time,
        zone=zone,
        camera_id=camera_id
    )
    service = AnalyticsService(db)
    return await service.get_congestion(query)


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    time_range: TimeRange = Query(TimeRange.ONE_HOUR),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    zone: Optional[str] = Query(None),
    resolution: int = Query(8, ge=5, le=10),
    db: AsyncSession = Depends(get_db)
):
    query = AnalyticsQuery(
        time_range=time_range,
        start_time=start_time,
        end_time=end_time,
        zone=zone
    )
    service = AnalyticsService(db)
    return await service.get_heatmap(query, resolution)


@router.get("/speed", response_model=SpeedResponse)
async def get_speeds(
    time_range: TimeRange = Query(TimeRange.ONE_HOUR),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = AnalyticsQuery(
        time_range=time_range,
        start_time=start_time,
        end_time=end_time
    )
    service = AnalyticsService(db)
    return await service.get_speeds(query)