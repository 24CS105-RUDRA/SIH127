from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from app.db.database import get_db
from app.services.alerts import AlertService
from app.schemas.alert import (
    AlertResponse, AlertListResponse, AlertStatus, 
    AlertType, AlertSeverity, AlertAcknowledge, AlertResolve
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    status: Optional[AlertStatus] = Query(None),
    alert_type: Optional[AlertType] = Query(None),
    severity: Optional[AlertSeverity] = Query(None),
    plate_text: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    service = AlertService(db)
    alerts, total = await service.get_alerts(
        status=status,
        alert_type=alert_type,
        severity=severity,
        plate_text=plate_text,
        camera_id=camera_id,
        start_time=start_time,
        end_time=end_time,
        page=page,
        page_size=page_size
    )
    return AlertListResponse(
        alerts=alerts,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    ack_data: AlertAcknowledge,
    db: AsyncSession = Depends(get_db)
):
    service = AlertService(db)
    alert = await service.acknowledge_alert(alert_id, ack_data.user_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: int,
    resolve_data: AlertResolve,
    db: AsyncSession = Depends(get_db)
):
    service = AlertService(db)
    alert = await service.resolve_alert(alert_id, resolve_data.user_id, resolve_data.note)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db)
):
    from app.models.alert import Alert
    from sqlalchemy import select
    
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return AlertResponse.model_validate(alert)