from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AlertType(str, Enum):
    BLACKLIST_HIT = "blacklist_hit"
    ANOMALY = "anomaly"
    SYSTEM = "system"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class AlertBase(BaseModel):
    plate_text: str
    camera_id: Optional[str] = None
    alert_type: AlertType
    severity: AlertSeverity
    details: Optional[Dict[str, Any]] = None


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    note: Optional[str] = None


class AlertResponse(AlertBase):
    id: int
    status: AlertStatus
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total: int
    page: int
    page_size: int


class AlertAcknowledge(BaseModel):
    user_id: str


class AlertResolve(BaseModel):
    user_id: str
    note: Optional[str] = None