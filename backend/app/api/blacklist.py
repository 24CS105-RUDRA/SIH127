from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from app.db.database import get_db
from app.models.blacklist import Blacklist
from app.models.sighting import PlateSighting
from app.services.plate_utils import normalize_plate
from app.schemas.blacklist import (
    BlacklistCreate, BlacklistUpdate, BlacklistResponse, 
    BlacklistListResponse, BlacklistImport, BlacklistReason
)
from sqlalchemy import select, func, or_

router = APIRouter(prefix="/blacklist", tags=["blacklist"])


@router.post("", response_model=BlacklistResponse, status_code=201)
async def add_to_blacklist(
    blacklist_data: BlacklistCreate,
    db: AsyncSession = Depends(get_db)
):
    norm_plate = normalize_plate(blacklist_data.plate_text)
    
    # Check if already exists
    result = await db.execute(
        select(Blacklist).where(Blacklist.plate_text == blacklist_data.plate_text)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Plate already in blacklist")
    
    entry = Blacklist(
        plate_text=blacklist_data.plate_text,
        normalized_plate=norm_plate,
        reason=blacklist_data.reason,
        added_by=blacklist_data.added_by,
        expires_at=blacklist_data.expires_at,
        is_active=True
    )
    
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    
    return BlacklistResponse.model_validate(entry)


@router.post("/import", response_model=BlacklistListResponse)
async def bulk_import_blacklist(
    import_data: BlacklistImport,
    db: AsyncSession = Depends(get_db)
):
    added = []
    errors = []
    
    for item in import_data.plates:
        norm_plate = normalize_plate(item.plate_text)
        
        result = await db.execute(
            select(Blacklist).where(Blacklist.plate_text == item.plate_text)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            errors.append({"plate": item.plate_text, "error": "Already exists"})
            continue
        
        entry = Blacklist(
            plate_text=item.plate_text,
            normalized_plate=norm_plate,
            reason=item.reason,
            added_by=item.added_by,
            expires_at=item.expires_at,
            is_active=True
        )
        
        db.add(entry)
        added.append(entry)
    
    await db.commit()
    
    for entry in added:
        await db.refresh(entry)
    
    return BlacklistListResponse(
        blacklist=[BlacklistResponse.model_validate(e) for e in added],
        total=len(added),
        page=1,
        page_size=len(added)
    )


@router.get("", response_model=BlacklistListResponse)
async def list_blacklist(
    active_only: bool = Query(True),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    query = select(Blacklist)
    
    if active_only:
        query = query.where(
            or_(
                Blacklist.expires_at.is_(None),
                Blacklist.expires_at > datetime.utcnow()
            ),
            Blacklist.is_active == True
        )
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    query = query.order_by(Blacklist.added_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    return BlacklistListResponse(
        blacklist=[BlacklistResponse.model_validate(e) for e in entries],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{plate_text}", response_model=BlacklistResponse)
async def get_blacklist_entry(
    plate_text: str,
    db: AsyncSession = Depends(get_db)
):
    norm_plate = normalize_plate(plate_text)
    result = await db.execute(
        select(Blacklist).where(
            or_(
                Blacklist.plate_text == plate_text,
                Blacklist.normalized_plate == norm_plate
            )
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Blacklist entry not found")
    
    return BlacklistResponse.model_validate(entry)


@router.patch("/{plate_text}", response_model=BlacklistResponse)
async def update_blacklist_entry(
    plate_text: str,
    update_data: BlacklistUpdate,
    db: AsyncSession = Depends(get_db)
):
    norm_plate = normalize_plate(plate_text)
    result = await db.execute(
        select(Blacklist).where(
            or_(
                Blacklist.plate_text == plate_text,
                Blacklist.normalized_plate == norm_plate
            )
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Blacklist entry not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(entry, field, value)
    
    await db.commit()
    await db.refresh(entry)
    
    return BlacklistResponse.model_validate(entry)


@router.delete("/{plate_text}", status_code=204)
async def remove_from_blacklist(
    plate_text: str,
    db: AsyncSession = Depends(get_db)
):
    norm_plate = normalize_plate(plate_text)
    result = await db.execute(
        select(Blacklist).where(
            or_(
                Blacklist.plate_text == plate_text,
                Blacklist.normalized_plate == norm_plate
            )
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Blacklist entry not found")
    
    await db.delete(entry)
    await db.commit()


@router.get("/{plate_text}/sightings", response_model=List[dict])
async def get_blacklist_sightings(
    plate_text: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Get recent sightings for a blacklisted plate"""
    norm_plate = normalize_plate(plate_text)
    
    result = await db.execute(
        select(PlateSighting)
        .where(PlateSighting.normalized_plate == norm_plate)
        .order_by(PlateSighting.ts.desc())
        .limit(limit)
    )
    sightings = result.scalars().all()
    
    return [
        {
            "camera_id": s.camera_id,
            "timestamp": s.ts.isoformat(),
            "confidence": s.confidence,
            "snapshot_url": s.snapshot_url
        }
        for s in sightings
    ]