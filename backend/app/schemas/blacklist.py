from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class BlacklistReason(str, Enum):
    STOLEN = "Stolen"
    WANTED = "Wanted"
    UNDER_INVESTIGATION = "Under Investigation"
    SUSPICIOUS = "Suspicious Activity"
    CUSTOM = "Custom"


class BlacklistBase(BaseModel):
    plate_text: str = Field(..., min_length=1, max_length=20)
    normalized_plate: Optional[str] = None
    reason: str
    added_by: Optional[str] = None


class BlacklistCreate(BlacklistBase):
    expires_at: Optional[datetime] = None


class BlacklistUpdate(BaseModel):
    reason: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class BlacklistResponse(BlacklistBase):
    added_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class BlacklistImport(BaseModel):
    plates: List[BlacklistCreate]


class BlacklistListResponse(BaseModel):
    blacklist: List[BlacklistResponse]
    total: int
    page: int
    page_size: int