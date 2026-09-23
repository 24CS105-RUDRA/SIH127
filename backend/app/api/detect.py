from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import base64
from app.db.database import get_db
from app.services.ingestion import IngestionService
from app.services.ml_client import MLServiceClient
from app.schemas.sighting import SightingCreate

router = APIRouter(prefix="/detect", tags=["detection"])


@router.post("")
async def detect_plates(
    image: UploadFile = File(...),
    camera_id: str = Form(...),
    timestamp: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Detect plates from uploaded image"""
    # Read and encode image
    image_data = await image.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    # Parse timestamp
    ts = None
    if timestamp:
        try:
            from datetime import datetime
            ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except:
            ts = datetime.utcnow()
    else:
        from datetime import datetime
        ts = datetime.utcnow()
    
    # Process through ingestion service
    service = IngestionService(db)
    sightings = await service.detect_and_ingest(image_base64, camera_id, ts)
    
    return {
        "detections": [
            {
                "plate_text": s.plate_text,
                "normalized_plate": s.normalized_plate,
                "camera_id": s.camera_id,
                "confidence": s.confidence,
                "timestamp": s.ts.isoformat()
            }
            for s in sightings
        ]
    }


@router.post("/batch")
async def detect_plates_batch(
    images: List[UploadFile] = File(...),
    camera_ids: List[str] = Form(...),
    timestamps: Optional[List[str]] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Detect plates from multiple images"""
    if len(images) != len(camera_ids):
        raise HTTPException(status_code=400, detail="Number of images must match number of camera_ids")
    
    results = []
    service = IngestionService(db)
    
    for i, image in enumerate(images):
        camera_id = camera_ids[i]
        
        # Parse timestamp
        ts = None
        if timestamps and i < len(timestamps):
            try:
                from datetime import datetime
                ts = datetime.fromisoformat(timestamps[i].replace('Z', '+00:00'))
            except:
                ts = datetime.utcnow()
        else:
            from datetime import datetime
            ts = datetime.utcnow()
        
        image_data = await image.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        sightings = await service.detect_and_ingest(image_base64, camera_id, ts)
        
        results.append({
            "camera_id": camera_id,
            "detections": [
                {
                    "plate_text": s.plate_text,
                    "normalized_plate": s.normalized_plate,
                    "confidence": s.confidence,
                    "timestamp": s.ts.isoformat()
                }
                for s in sightings
            ]
        })
    
    return {"results": results}


@router.post("/base64")
async def detect_from_base64(
    image_base64: str,
    camera_id: str,
    timestamp: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Detect plates from base64 encoded image"""
    ts = None
    if timestamp:
        try:
            from datetime import datetime
            ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except:
            ts = datetime.utcnow()
    else:
        from datetime import datetime
        ts = datetime.utcnow()
    
    service = IngestionService(db)
    sightings = await service.detect_and_ingest(image_base64, camera_id, ts)
    
    return {
        "detections": [
            {
                "plate_text": s.plate_text,
                "normalized_plate": s.normalized_plate,
                "camera_id": s.camera_id,
                "confidence": s.confidence,
                "timestamp": s.ts.isoformat()
            }
            for s in sightings
        ]
    }