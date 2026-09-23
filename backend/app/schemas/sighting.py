from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class SightingBase(BaseModel):
    plate_text: str = Field(..., min_length=1, max_length=20)
    normalized_plate: Optional[str] = None
    camera_id: str
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    snapshot_url: Optional[str] = None
    bbox: Optional[dict] = None
    ts: datetime


class SightingCreate(SightingBase):
    pass


class SightingBatchCreate(BaseModel):
    sightings: List[SightingCreate]


class SightingResponse(SightingBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class SightingListResponse(BaseModel):
    sightings: List[SightingResponse]
    total: int
    page: int
    page_size: int


class TrajectoryPoint(BaseModel):
    camera_id: str
    camera_zone: Optional[str] = None
    lat: float
    lon: float
    timestamp: datetime
    plate_text: str
    confidence: Optional[float] = None
    snapshot_url: Optional[str] = None
    speed_kmph: Optional[float] = None
    direction: Optional[str] = None
    bearing: Optional[float] = None


class TrajectoryResponse(BaseModel):
    plate: str
    points: List[TrajectoryPoint]
    total_distance_km: Optional[float] = None
    avg_speed_kmph: Optional[float] = None
    start_time: datetime
    end_time: datetime
    sighting_count: int