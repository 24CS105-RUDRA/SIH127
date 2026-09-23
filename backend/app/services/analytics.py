from sqlalchemy import select, func, and_, distinct, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from collections import defaultdict
import h3
from app.models.sighting import PlateSighting
from app.models.camera import Camera
from app.models.analytics import (
    AnalyticsDensity, AnalyticsODMatrix, AnalyticsCongestion, AnalyticsHeatmap
)
from app.schemas.analytics import (
    DensityPoint, DensityResponse, ODMatrixCell, ODMatrixResponse,
    CongestionPoint, CongestionResponse, HeatmapCell, HeatmapResponse,
    SpeedSegment, SpeedResponse, KPIResponse, AnalyticsQuery, TimeRange
)


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_time_bounds(self, query: AnalyticsQuery) -> tuple[datetime, datetime]:
        """Get start and end time from query"""
        end_time = query.end_time or datetime.utcnow()
        
        if query.time_range == TimeRange.ONE_HOUR:
            start_time = end_time - timedelta(hours=1)
        elif query.time_range == TimeRange.SIX_HOURS:
            start_time = end_time - timedelta(hours=6)
        elif query.time_range == TimeRange.TWENTY_FOUR_HOURS:
            start_time = end_time - timedelta(hours=24)
        elif query.time_range == TimeRange.SEVEN_DAYS:
            start_time = end_time - timedelta(days=7)
        else:
            start_time = query.start_time or (end_time - timedelta(hours=1))
        
        return start_time, end_time

    def _get_bucket_interval(self, start: datetime, end: datetime) -> timedelta:
        """Determine bucket interval based on time range"""
        duration = end - start
        if duration <= timedelta(hours=1):
            return timedelta(minutes=5)
        elif duration <= timedelta(hours=6):
            return timedelta(minutes=15)
        elif duration <= timedelta(hours=24):
            return timedelta(hours=1)
        else:
            return timedelta(hours=6)

    async def get_kpis(self) -> KPIResponse:
        """Get dashboard KPIs"""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Total vehicles today
        vehicle_result = await self.db.execute(
            select(func.count(distinct(PlateSighting.plate_text))).where(
                PlateSighting.ts >= today_start
            )
        )
        total_vehicles = vehicle_result.scalar() or 0
        
        # Active cameras (cameras with sightings in last hour)
        hour_ago = now - timedelta(hours=1)
        camera_result = await self.db.execute(
            select(func.count(distinct(PlateSighting.camera_id))).where(
                PlateSighting.ts >= hour_ago
            )
        )
        active_cameras = camera_result.scalar() or 0
        
        # Total cameras
        total_cameras_result = await self.db.execute(
            select(func.count(Camera.camera_id)).where(Camera.status == 'online')
        )
        total_cameras = total_cameras_result.scalar() or 0
        
        # Active alerts
        alert_result = await self.db.execute(
            select(func.count(1)).where(
                and_(
                    # Alert model needed
                    text("1=1")
                )
            )
        )
        # Simplified - just return 0 for now
        active_alerts = 0
        
        # Average city speed (last hour)
        speed_result = await self.db.execute(text("""
            SELECT avg_speed FROM analytics_congestion 
            WHERE bucket_start >= :hour_ago 
            ORDER BY bucket_start DESC LIMIT 1
        """), {"hour_ago": hour_ago})
        avg_speed = speed_result.scalar()
        
        return KPIResponse(
            total_vehicles_today=total_vehicles,
            active_cameras=active_cameras,
            total_cameras=total_cameras,
            active_alerts=active_alerts,
            avg_city_speed_kmph=avg_speed
        )

    async def get_density(self, query: AnalyticsQuery) -> DensityResponse:
        """Get traffic density per camera"""
        start_time, end_time = self._get_time_bounds(query)
        
        # Get sightings grouped by camera and time bucket
        bucket_interval = self._get_bucket_interval(start_time, end_time)
        
        # Use time_bucket from TimescaleDB
        interval_str = self._interval_to_pg(bucket_interval)
        
        sql = f"""
            SELECT 
                ps.camera_id,
                c.zone,
                c.location,
                time_bucket('{interval_str}', ps.ts) as bucket_start,
                COUNT(DISTINCT ps.plate_text) as vehicle_count
            FROM plate_sightings ps
            JOIN cameras c ON ps.camera_id = c.camera_id
            WHERE ps.ts >= :start_time AND ps.ts <= :end_time
        """
        
        params = {"start_time": start_time, "end_time": end_time}
        
        if query.zone:
            sql += " AND c.zone = :zone"
            params["zone"] = query.zone
        if query.camera_id:
            sql += " AND ps.camera_id = :camera_id"
            params["camera_id"] = query.camera_id
            
        sql += """
            GROUP BY ps.camera_id, c.zone, c.location, time_bucket('{interval_str}', ps.ts)
            ORDER BY bucket_start DESC
        """.format(interval_str=interval_str)
        
        result = await self.db.execute(text(sql), params)
        
        data = []
        total_vehicles = 0
        for row in result:
            camera_id, zone, location, bucket_start, vehicle_count = row
            if location:
                lat, lon = location.y, location.x
            else:
                lat, lon = 0.0, 0.0
            
            data.append(DensityPoint(
                camera_id=camera_id,
                zone=zone,
                lat=lat,
                lon=lon,
                vehicle_count=vehicle_count,
                bucket_start=bucket_start,
                bucket_end=bucket_start + bucket_interval
            ))
            total_vehicles += vehicle_count
        
        return DensityResponse(
            data=data,
            time_range=query.time_range,
            total_vehicles=total_vehicles
        )

    async def get_od_matrix(self, query: AnalyticsQuery) -> ODMatrixResponse:
        """Get Origin-Destination matrix"""
        start_time, end_time = self._get_time_bounds(query)
        
        # Find vehicles seen at multiple cameras
        sql = """
            WITH vehicle_cameras AS (
                SELECT 
                    plate_text,
                    camera_id,
                    ts,
                    LAG(camera_id) OVER (PARTITION BY plate_text ORDER BY ts) as prev_camera,
                    LAG(ts) OVER (PARTITION BY plate_text ORDER BY ts) as prev_ts
                FROM plate_sightings
                WHERE ts >= :start_time AND ts <= :end_time
            )
            SELECT 
                vc.camera_id as dest_camera,
                c1.zone as dest_zone,
                vc.prev_camera as origin_camera,
                c2.zone as origin_zone,
                COUNT(DISTINCT vc.plate_text) as vehicle_count
            FROM vehicle_cameras vc
            JOIN cameras c1 ON vc.camera_id = c1.camera_id
            JOIN cameras c2 ON vc.prev_camera = c2.camera_id
            WHERE vc.prev_camera IS NOT NULL
            AND vc.prev_camera != vc.camera_id
        """
        
        params = {"start_time": start_time, "end_time": end_time}
        
        if query.zone:
            sql += " AND c1.zone = :zone AND c2.zone = :zone"
            params["zone"] = query.zone
            
        sql += """
            GROUP BY vc.camera_id, c1.zone, vc.prev_camera, c2.zone
            ORDER BY vehicle_count DESC
        """
        
        result = await self.db.execute(text(sql), params)
        
        matrix = []
        total_trips = 0
        for row in result:
            dest_camera, dest_zone, origin_camera, origin_zone, vehicle_count = row
            matrix.append(ODMatrixCell(
                origin_camera=origin_camera,
                origin_zone=origin_zone,
                dest_camera=dest_camera,
                dest_zone=dest_zone,
                vehicle_count=vehicle_count
            ))
            total_trips += vehicle_count
        
        return ODMatrixResponse(
            matrix=matrix,
            time_range=query.time_range,
            total_trips=total_trips
        )

    async def get_congestion(self, query: AnalyticsQuery) -> CongestionResponse:
        """Get congestion data"""
        start_time, end_time = self._get_time_bounds(query)
        
        sql = """
            SELECT 
                ac.camera_id,
                c.zone,
                c.location,
                ac.density_score,
                ac.avg_speed,
                ac.congestion_level,
                ac.z_score
            FROM analytics_congestion ac
            JOIN cameras c ON ac.camera_id = c.camera_id
            WHERE ac.bucket_start >= :start_time AND ac.bucket_start <= :end_time
        """
        
        params = {"start_time": start_time, "end_time": end_time}
        
        if query.zone:
            sql += " AND c.zone = :zone"
            params["zone"] = query.zone
        if query.camera_id:
            sql += " AND ac.camera_id = :camera_id"
            params["camera_id"] = query.camera_id
            
        sql += " ORDER BY ac.bucket_start DESC"
        
        result = await self.db.execute(text(sql), params)
        
        data = []
        for row in result:
            camera_id, zone, location, density_score, avg_speed, congestion_level, z_score = row
            if location:
                lat, lon = location.y, location.x
            else:
                lat, lon = 0.0, 0.0
            
            data.append(CongestionPoint(
                camera_id=camera_id,
                zone=zone,
                lat=lat,
                lon=lon,
                density_score=density_score,
                avg_speed=avg_speed,
                congestion_level=congestion_level,
                z_score=z_score
            ))
        
        return CongestionResponse(
            data=data,
            time_range=query.time_range
        )

    async def get_heatmap(self, query: AnalyticsQuery, resolution: int = 8) -> HeatmapResponse:
        """Get H3 heatmap data"""
        start_time, end_time = self._get_time_bounds(query)
        
        sql = """
            SELECT 
                c.location,
                COUNT(DISTINCT ps.plate_text) as vehicle_count
            FROM plate_sightings ps
            JOIN cameras c ON ps.camera_id = c.camera_id
            WHERE ps.ts >= :start_time AND ps.ts <= :end_time
            AND c.location IS NOT NULL
        """
        
        params = {"start_time": start_time, "end_time": end_time}
        
        if query.zone:
            sql += " AND c.zone = :zone"
            params["zone"] = query.zone
            
        sql += " GROUP BY c.location"
        
        result = await self.db.execute(text(sql), params)
        
        # Aggregate to H3 hexagons
        h3_counts = defaultdict(int)
        for row in result:
            location, count = row
            if location:
                lat, lon = location.y, location.x
                h3_index = h3.geo_to_h3(lat, lon, resolution)
                h3_counts[h3_index] += count
        
        cells = []
        total = 0
        for h3_index, count in h3_counts.items():
            lat, lon = h3.h3_to_geo(h3_index)
            cells.append(HeatmapCell(
                h3_index=h3_index,
                lat=lat,
                lon=lon,
                vehicle_count=count
            ))
            total += count
        
        return HeatmapResponse(
            cells=cells,
            resolution=resolution,
            time_range=query.time_range,
            total_vehicles=total
        )

    async def get_speeds(self, query: AnalyticsQuery) -> SpeedResponse:
        """Get average speeds per road segment"""
        start_time, end_time = self._get_time_bounds(query)
        
        sql = """
            WITH vehicle_paths AS (
                SELECT 
                    plate_text,
                    camera_id,
                    ts,
                    LAG(camera_id) OVER (PARTITION BY plate_text ORDER BY ts) as prev_camera,
                    LAG(ts) OVER (PARTITION BY plate_text ORDER BY ts) as prev_ts
                FROM plate_sightings
                WHERE ts >= :start_time AND ts <= :end_time
            ),
            segment_speeds AS (
                SELECT 
                    vp.prev_camera as origin_camera,
                    vp.camera_id as dest_camera,
                    c1.location as origin_loc,
                    c2.location as dest_loc,
                    vp.prev_ts,
                    vp.ts,
                    ST_Distance(c1.location::geography, c2.location::geography) / 1000.0 as distance_km,
                    EXTRACT(EPOCH FROM (vp.ts - vp.prev_ts)) / 3600.0 as time_hours
                FROM vehicle_paths vp
                JOIN cameras c1 ON vp.prev_camera = c1.camera_id
                JOIN cameras c2 ON vp.camera_id = c2.camera_id
                WHERE vp.prev_camera IS NOT NULL
                AND vp.prev_camera != vp.camera_id
                AND vp.ts > vp.prev_ts
            )
            SELECT 
                origin_camera,
                dest_camera,
                AVG(distance_km / NULLIF(time_hours, 0)) as avg_speed_kmph,
                AVG(distance_km) as avg_distance_km,
                COUNT(*) as sample_count
            FROM segment_speeds
            WHERE time_hours > 0 AND time_hours < 2  -- Filter unrealistic times
            GROUP BY origin_camera, dest_camera
            HAVING COUNT(*) >= 2
            ORDER BY avg_speed_kmph
        """
        
        params = {"start_time": start_time, "end_time": end_time}
        result = await self.db.execute(text(sql), params)
        
        segments = []
        for row in result:
            origin, dest, avg_speed, avg_dist, count = row
            segments.append(SpeedSegment(
                origin_camera=origin,
                dest_camera=dest,
                distance_km=avg_dist or 0,
                avg_speed_kmph=avg_speed or 0,
                sample_count=count
            ))
        
        return SpeedResponse(
            segments=segments,
            time_range=query.time_range
        )

    def _interval_to_pg(self, interval: timedelta) -> str:
        """Convert timedelta to PostgreSQL interval string"""
        total_seconds = int(interval.total_seconds())
        if total_seconds < 60:
            return f"{total_seconds} seconds"
        elif total_seconds < 3600:
            return f"{total_seconds // 60} minutes"
        elif total_seconds < 86400:
            return f"{total_seconds // 3600} hours"
        else:
            return f"{total_seconds // 86400} days"