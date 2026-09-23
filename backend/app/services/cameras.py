from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from app.models.camera import Camera
from app.models.sighting import PlateSighting
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse, CameraWithMetrics


class CameraService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_camera(self, camera_data: CameraCreate) -> Camera:
        """Create a new camera"""
        from geoalchemy2 import WKTElement
        
        point = WKTElement(f"POINT({camera_data.lon} {camera_data.lat})", srid=4326)
        
        camera = Camera(
            camera_id=camera_data.camera_id,
            location=point,
            zone=camera_data.zone,
            direction=camera_data.direction,
            status=camera_data.status,
            stream_url=camera_data.stream_url
        )
        self.db.add(camera)
        await self.db.commit()
        await self.db.refresh(camera)
        return camera

    async def get_camera(self, camera_id: str) -> Optional[Camera]:
        """Get a camera by ID"""
        result = await self.db.execute(
            select(Camera).where(Camera.camera_id == camera_id)
        )
        return result.scalar_one_or_none()

    async def get_cameras(
        self,
        zone: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> tuple[List[CameraResponse], int]:
        """Get cameras with filters"""
        query = select(Camera)
        
        if zone:
            query = query.where(Camera.zone == zone)
        if status:
            query = query.where(Camera.status == status)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        query = query.order_by(Camera.camera_id)
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await self.db.execute(query)
        cameras = result.scalars().all()
        
        return [CameraResponse.model_validate(c) for c in cameras], total

    async def update_camera(self, camera_id: str, update_data: CameraUpdate) -> Optional[Camera]:
        """Update a camera"""
        result = await self.db.execute(
            select(Camera).where(Camera.camera_id == camera_id)
        )
        camera = result.scalar_one_or_none()
        
        if not camera:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(camera, field, value)
        
        await self.db.commit()
        await self.db.refresh(camera)
        return camera

    async def delete_camera(self, camera_id: str) -> bool:
        """Delete a camera"""
        result = await self.db.execute(
            select(Camera).where(Camera.camera_id == camera_id)
        )
        camera = result.scalar_one_or_none()
        
        if not camera:
            return False
        
        await self.db.delete(camera)
        await self.db.commit()
        return True

    async def get_camera_with_metrics(self, camera_id: str) -> Optional[CameraWithMetrics]:
        """Get camera with OCR accuracy metrics"""
        result = await self.db.execute(
            select(Camera).where(Camera.camera_id == camera_id)
        )
        camera = result.scalar_one_or_none()
        
        if not camera:
            return None
        
        # Get OCR accuracy for last 24h
        day_ago = datetime.utcnow() - timedelta(hours=24)
        accuracy_result = await self.db.execute(
            select(func.avg(PlateSighting.confidence)).where(
                and_(
                    PlateSighting.camera_id == camera_id,
                    PlateSighting.ts >= day_ago
                )
            )
        )
        ocr_accuracy = accuracy_result.scalar()
        
        # Get last ping
        last_ping_result = await self.db.execute(
            select(func.max(PlateSighting.ts)).where(
                PlateSighting.camera_id == camera_id
            )
        )
        last_ping = last_ping_result.scalar()
        
        camera_response = CameraResponse.model_validate(camera)
        return CameraWithMetrics(
            **camera_response.model_dump(),
            ocr_accuracy_24h=ocr_accuracy,
            last_ping=last_ping
        )

    async def get_all_zones(self) -> List[str]:
        """Get all unique zones"""
        result = await self.db.execute(
            select(distinct(Camera.zone)).where(Camera.zone.isnot(None))
        )
        return [row[0] for row in result]

    async def get_camera_locations(self) -> List[Dict]:
        """Get all camera locations for map"""
        result = await self.db.execute(
            select(Camera.camera_id, Camera.location, Camera.zone, Camera.status)
        )
        locations = []
        for camera_id, location, zone, status in result:
            if location:
                locations.append({
                    "camera_id": camera_id,
                    "lat": location.y,
                    "lon": location.x,
                    "zone": zone,
                    "status": status
                })
        return locations