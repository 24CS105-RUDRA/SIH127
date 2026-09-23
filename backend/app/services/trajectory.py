from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Tuple
from datetime import datetime, timedelta
from geopy.distance import geodesic
from app.models.sighting import PlateSighting
from app.models.camera import Camera
from app.models.blacklist import Blacklist
from app.schemas.sighting import TrajectoryPoint, TrajectoryResponse
from app.services.plate_utils import normalize_plate, fuzzy_match_plate, is_plausible_transition


class TrajectoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_camera_locations(self) -> Dict[str, Tuple[float, float]]:
        """Get all camera locations as dict"""
        result = await self.db.execute(
            select(Camera.camera_id, Camera.location)
        )
        locations = {}
        for camera_id, location in result:
            if location:
                # PostGIS geography point -> (lat, lon)
                lat = location.y
                lon = location.x
                locations[camera_id] = (lat, lon)
        return locations

    async def get_trajectory(
        self,
        plate: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        camera_zone: Optional[str] = None,
        confidence_threshold: float = 0.0,
        fuzzy_threshold: int = 1
    ) -> TrajectoryResponse:
        """Get trajectory for a plate with fuzzy matching"""
        
        norm_plate = normalize_plate(plate)
        
        # First try exact match on normalized plate
        query = select(PlateSighting).where(
            PlateSighting.normalized_plate == norm_plate
        )
        
        if start_time:
            query = query.where(PlateSighting.ts >= start_time)
        if end_time:
            query = query.where(PlateSighting.ts <= end_time)
        if confidence_threshold:
            query = query.where(PlateSighting.confidence >= confidence_threshold)
            
        query = query.order_by(PlateSighting.ts.asc())
        result = await self.db.execute(query)
        exact_sightings = result.scalars().all()
        
        # If no exact matches, try fuzzy matching
        if not exact_sightings:
            # Get candidate plates from same time window
            candidate_query = select(PlateSighting.plate_text).distinct()
            if start_time:
                candidate_query = candidate_query.where(PlateSighting.ts >= start_time)
            if end_time:
                candidate_query = candidate_query.where(PlateSighting.ts <= end_time)
            
            candidate_result = await self.db.execute(candidate_query)
            candidates = [row[0] for row in candidate_result]
            
            # Fuzzy match
            matches = fuzzy_match_plate(plate, candidates, fuzzy_threshold)
            
            if matches:
                # Get sightings for all matched plates
                matched_plates = [m[0] for m in matches]
                query = select(PlateSighting).where(
                    PlateSighting.plate_text.in_(matched_plates)
                )
                if start_time:
                    query = query.where(PlateSighting.ts >= start_time)
                if end_time:
                    query = query.where(PlateSighting.ts <= end_time)
                if confidence_threshold:
                    query = query.where(PlateSighting.confidence >= confidence_threshold)
                    
                query = query.order_by(PlateSighting.ts.asc())
                result = await self.db.execute(query)
                exact_sightings = result.scalars().all()
        
        if not exact_sightings:
            return TrajectoryResponse(
                plate=plate,
                points=[],
                start_time=start_time or datetime.utcnow(),
                end_time=end_time or datetime.utcnow(),
                sighting_count=0
            )
        
        # Get camera locations for speed/direction calculation
        camera_locations = await self.get_camera_locations()
        
        # Build trajectory points
        points = []
        total_distance = 0.0
        speeds = []
        
        for i, sighting in enumerate(exact_sightings):
            # Get camera info
            camera_result = await self.db.execute(
                select(Camera).where(Camera.camera_id == sighting.camera_id)
            )
            camera = camera_result.scalar_one_or_none()
            
            if not camera or not camera.location:
                continue
            
            lat = camera.location.y
            lon = camera.location.x
            
            speed_kmph = None
            bearing = None
            direction = None
            
            if i > 0:
                prev_sighting = exact_sightings[i - 1]
                prev_camera_result = await self.db.execute(
                    select(Camera).where(Camera.camera_id == prev_sighting.camera_id)
                )
                prev_camera = prev_camera_result.scalar_one_or_none()
                
                if prev_camera and prev_camera.location:
                    prev_lat = prev_camera.location.y
                    prev_lon = prev_camera.location.x
                    
                    # Calculate distance
                    dist = geodesic((prev_lat, prev_lon), (lat, lon)).kilometers
                    total_distance += dist
                    
                    # Calculate time diff
                    time_diff = (sighting.ts - prev_sighting.ts).total_seconds()
                    if time_diff > 0:
                        speed_kmph = (dist / time_diff) * 3600
                        speeds.append(speed_kmph)
                    
                    # Calculate bearing
                    bearing = self._calculate_bearing(prev_lat, prev_lon, lat, lon)
                    direction = self._bearing_to_direction(bearing)
            
            point = TrajectoryPoint(
                camera_id=sighting.camera_id,
                camera_zone=camera.zone,
                lat=lat,
                lon=lon,
                timestamp=sighting.ts,
                plate_text=sighting.plate_text,
                confidence=sighting.confidence,
                snapshot_url=sighting.snapshot_url,
                speed_kmph=speed_kmph,
                direction=direction,
                bearing=bearing
            )
            points.append(point)
        
        # Filter by zone if specified
        if camera_zone:
            points = [p for p in points if p.camera_zone == camera_zone]
        
        # Calculate averages
        avg_speed = sum(speeds) / len(speeds) if speeds else None
        
        return TrajectoryResponse(
            plate=plate,
            points=points,
            total_distance_km=total_distance if total_distance > 0 else None,
            avg_speed_kmph=avg_speed,
            start_time=points[0].timestamp if points else (start_time or datetime.utcnow()),
            end_time=points[-1].timestamp if points else (end_time or datetime.utcnow()),
            sighting_count=len(points)
        )

    def _calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate bearing between two points"""
        from math import radians, degrees, sin, cos, atan2
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        dlon = lon2 - lon1
        x = sin(dlon) * cos(lat2)
        y = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)
        
        bearing = atan2(x, y)
        return (degrees(bearing) + 360) % 360

    def _bearing_to_direction(self, bearing: float) -> str:
        """Convert bearing to cardinal direction"""
        directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        index = round(bearing / 45) % 8
        return directions[index]

    async def search_plates(
        self,
        query: str,
        limit: int = 10,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict]:
        """Search for plates with fuzzy matching for autocomplete"""
        norm_query = normalize_plate(query)
        
        # Get distinct plates from time window
        sighting_query = select(PlateSighting.plate_text, PlateSighting.ts, PlateSighting.camera_id).distinct()
        if start_time:
            sighting_query = sighting_query.where(PlateSighting.ts >= start_time)
        if end_time:
            sighting_query = sighting_query.where(PlateSighting.ts <= end_time)
        sighting_query = sighting_query.order_by(PlateSighting.ts.desc()).limit(1000)
        
        result = await self.db.execute(sighting_query)
        plates_data = result.all()
        
        # Group by plate and get latest sighting
        plate_latest = {}
        for plate_text, ts, camera_id in plates_data:
            if plate_text not in plate_latest or ts > plate_latest[plate_text][0]:
                plate_latest[plate_text] = (ts, camera_id)
        
        candidates = list(plate_latest.keys())
        matches = fuzzy_match_plate(query, candidates, threshold=1)
        
        results = []
        for plate_text, similarity in matches[:limit]:
            ts, camera_id = plate_latest[plate_text]
            results.append({
                "plate": plate_text,
                "similarity": similarity,
                "last_seen": ts.isoformat(),
                "camera_id": camera_id
            })
        
        return results