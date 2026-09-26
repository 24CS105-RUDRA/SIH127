from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CameraStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ALERTING = "alerting"


class CameraBase(BaseModel):
    camera_id: str
    zone: Optional[str] = None
    direction: Optional[str] = None
    status: CameraStatus = CameraStatus.ONLINE
    stream_url: Optional[str] = None


class CameraCreate(CameraBase):
    lat: float
    lon: float


class CameraUpdate(BaseModel):
    zone: Optional[str] = None
    direction: Optional[str] = None
    status: Optional[CameraStatus] = None
    stream_url: Optional[str] = None


class CameraResponse(CameraBase):
    lat: float
    lon: float
    installed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CameraWithMetrics(CameraResponse):
    ocr_accuracy_24h: Optional[float] = None
    last_ping: Optional[datetime] = None


class CameraListResponse(BaseModel):
    cameras: List[CameraResponse]
    total: int
    page: int
    page_size: int