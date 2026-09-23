from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from app.models.sighting import PlateSighting
from app.models.camera import Camera
from app.services.plate_utils import normalize_plate
from app.services.alerts import AlertService
from app.services.ml_client import MLServiceClient
from app.schemas.sighting import SightingCreate
import redis.asyncio as redis
import json
from app.core.config import settings


class IngestionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_service = AlertService(db)
        self.ml_client = MLServiceClient()
        self.redis_client = None

    async def _get_redis(self):
        if self.redis_client is None:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        return self.redis_client

    async def ingest_sighting(self, sighting_data: SightingCreate) -> PlateSighting:
        """Ingest a normalized plate sighting"""
        # Normalize plate
        norm_plate = normalize_plate(sighting_data.plate_text)
        
        # Create sighting record
        sighting = PlateSighting(
            plate_text=sighting_data.plate_text,
            normalized_plate=norm_plate,
            camera_id=sighting_data.camera_id,
            confidence=sighting_data.confidence,
            snapshot_url=sighting_data.snapshot_url,
            bbox=sighting_data.bbox,
            ts=sighting_data.ts
        )
        
        self.db.add(sighting)
        await self.db.commit()
        await self.db.refresh(sighting)
        
        # Publish to Redis Streams for real-time processing
        await self._publish_sighting(sighting)
        
        # Check for alerts
        alerts = await self.alert_service.process_sighting(sighting)
        
        # Publish alerts to Redis
        for alert in alerts:
            await self._publish_alert(alert)
        
        return sighting

    async def ingest_batch(self, sightings_data: List[SightingCreate]) -> List[PlateSighting]:
        """Ingest multiple sightings"""
        results = []
        for sighting_data in sightings_data:
            sighting = await self.ingest_sighting(sighting_data)
            results.append(sighting)
        return results

    async def detect_and_ingest(self, image_base64: str, camera_id: str, timestamp: datetime = None) -> List[PlateSighting]:
        """Detect plates from image and ingest"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Get detections from ML service
        detections = await self.ml_client.detect_plates(image_base64, camera_id)
        
        results = []
        for detection in detections:
            sighting_data = SightingCreate(
                plate_text=detection["plate_text"],
                camera_id=camera_id,
                confidence=detection.get("confidence"),
                snapshot_url=detection.get("snapshot_url"),
                bbox=detection.get("bbox"),
                ts=timestamp
            )
            sighting = await self.ingest_sighting(sighting_data)
            results.append(sighting)
        
        return results

    async def _publish_sighting(self, sighting: PlateSighting):
        """Publish sighting to Redis Stream"""
        try:
            redis_client = await self._get_redis()
            stream_data = {
                "id": str(sighting.id),
                "plate_text": sighting.plate_text,
                "normalized_plate": sighting.normalized_plate,
                "camera_id": sighting.camera_id,
                "confidence": str(sighting.confidence) if sighting.confidence else "",
                "timestamp": sighting.ts.isoformat(),
                "snapshot_url": sighting.snapshot_url or ""
            }
            await redis_client.xadd("plate_sightings", stream_data, maxlen=10000)
        except Exception as e:
            print(f"Failed to publish sighting to Redis: {e}")

    async def _publish_alert(self, alert):
        """Publish alert to Redis Stream"""
        try:
            redis_client = await self._get_redis()
            stream_data = {
                "alert_id": str(alert.id),
                "plate_text": alert.plate_text,
                "camera_id": alert.camera_id or "",
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "details": json.dumps(alert.details) if alert.details else "{}",
                "created_at": alert.created_at.isoformat()
            }
            await redis_client.xadd("alerts", stream_data, maxlen=10000)
        except Exception as e:
            print(f"Failed to publish alert to Redis: {e}")

    async def get_recent_sightings(
        self,
        camera_id: Optional[str] = None,
        plate_text: Optional[str] = None,
        limit: int = 100
    ) -> List[PlateSighting]:
        """Get recent sightings"""
        query = select(PlateSighting).order_by(PlateSighting.ts.desc()).limit(limit)
        
        if camera_id:
            query = query.where(PlateSighting.camera_id == camera_id)
        if plate_text:
            norm_plate = normalize_plate(plate_text)
            query = query.where(PlateSighting.normalized_plate == norm_plate)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_sighting_count(
        self,
        camera_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> int:
        """Get sighting count for analytics"""
        query = select(func.count(PlateSighting.id))
        
        if camera_id:
            query = query.where(PlateSighting.camera_id == camera_id)
        if start_time:
            query = query.where(PlateSighting.ts >= start_time)
        if end_time:
            query = query.where(PlateSighting.ts <= end_time)
        
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def close(self):
        await self.ml_client.close()
        if self.redis_client:
            await self.redis_client.close()