from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TimeRange(str, Enum):
    ONE_HOUR = "1h"
    SIX_HOURS = "6h"
    TWENTY_FOUR_HOURS = "24h"
    SEVEN_DAYS = "7d"
    CUSTOM = "custom"


class DensityPoint(BaseModel):
    camera_id: str
    zone: Optional[str] = None
    lat: float
    lon: float
    vehicle_count: int
    bucket_start: datetime
    bucket_end: datetime


class DensityResponse(BaseModel):
    data: List[DensityPoint]
    time_range: TimeRange
    total_vehicles: int


class ODMatrixCell(BaseModel):
    origin_camera: str
    origin_zone: Optional[str] = None
    dest_camera: str
    dest_zone: Optional[str] = None
    vehicle_count: int


class ODMatrixResponse(BaseModel):
    matrix: List[ODMatrixCell]
    time_range: TimeRange
    total_trips: int


class CongestionPoint(BaseModel):
    camera_id: str
    zone: Optional[str] = None
    lat: float
    lon: float
    density_score: float
    avg_speed: Optional[float] = None
    congestion_level: str
    z_score: Optional[float] = None


class CongestionResponse(BaseModel):
    data: List[CongestionPoint]
    time_range: TimeRange


class HeatmapCell(BaseModel):
    h3_index: str
    lat: float
    lon: float
    vehicle_count: int


class HeatmapResponse(BaseModel):
    cells: List[HeatmapCell]
    resolution: int
    time_range: TimeRange
    total_vehicles: int


class SpeedSegment(BaseModel):
    origin_camera: str
    dest_camera: str
    distance_km: float
    avg_speed_kmph: float
    sample_count: int


class SpeedResponse(BaseModel):
    segments: List[SpeedSegment]
    time_range: TimeRange


class KPIResponse(BaseModel):
    total_vehicles_today: int
    active_cameras: int
    total_cameras: int
    active_alerts: int
    avg_city_speed_kmph: Optional[float] = None


class AnalyticsQuery(BaseModel):
    time_range: TimeRange = TimeRange.ONE_HOUR
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    zone: Optional[str] = None
    camera_id: Optional[str] = None