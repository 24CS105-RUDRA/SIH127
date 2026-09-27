from sqlalchemy import select, func, and_, distinct, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from collections import defaultdict
import h3
import math
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


# h3 renamed its coordinate helpers in v4 (geo_to_h3 -> latlng_to_cell).
# Support both so the code works with h3 3.x and 4.x.
def _h3_cell(lat: float, lon: float, resolution: int) -> str:
    if hasattr(h3, "latlng_to_cell"):
        return h3.latlng_to_cell(lat, lon, resolution)
    return h3.geo_to_h3(lat, lon, resolution)


def _h3_center(cell: str) -> tuple:
    if hasattr(h3, "cell_to_latlng"):
        lat, lon = h3.cell_to_latlng(cell)
    else:
        lat, lon = h3.h3_to_geo(cell)
    return lat, lon


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two lat/lon points using haversine formula"""
    R = 6371  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


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
        
        # Active alerts (simplified)
        active_alerts = 0
        
        # Average city speed (last hour) - from analytics_congestion
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
        
        # Use date_trunc for time bucketing (standard PostgreSQL)
        interval_seconds = int(bucket_interval.total_seconds())
        if interval_seconds < 60:
            bucket_sql = "date_trunc('minute', ps.ts)"
        elif interval_seconds < 3600:
            minutes = interval_seconds // 60
            bucket_sql = f"date_trunc('hour', ps.ts) + interval '{minutes} min' * floor(extract(minute from ps.ts) / {minutes})"
        elif interval_seconds < 86400:
            hours = interval_seconds // 3600
            bucket_sql = f"date_trunc('hour', ps.ts) + interval '{hours} hour' * floor(extract(hour from ps.ts) / {hours})"
        else:
            bucket_sql = "date_trunc('day', ps.ts)"
        
        sql = f"""
            SELECT 
                ps.camera_id,
                c.zone,
                c.lat,
                c.lon,
                {bucket_sql} as bucket_start,
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
            
        sql += f"""
            GROUP BY ps.camera_id, c.zone, c.lat, c.lon, {bucket_sql}
            ORDER BY bucket_start DESC
        """
        
        result = await self.db.execute(text(sql), params)
        
        data = []
        total_vehicles = 0
        for row in result:
            camera_id, zone, lat, lon, bucket_start, vehicle_count = row
            
            data.append(DensityPoint(
                camera_id=camera_id,
                zone=zone,
                lat=lat or 0.0,
                lon=lon or 0.0,
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
                c.lat,
                c.lon,
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
            camera_id, zone, lat, lon, density_score, avg_speed, congestion_level, z_score = row
            
            data.append(CongestionPoint(
                camera_id=camera_id,
                zone=zone,
                lat=lat or 0.0,
                lon=lon or 0.0,
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
                c.lat,
                c.lon,
                COUNT(DISTINCT ps.plate_text) as vehicle_count
            FROM plate_sightings ps
            JOIN cameras c ON ps.camera_id = c.camera_id
            WHERE ps.ts >= :start_time AND ps.ts <= :end_time
            AND c.lat IS NOT NULL AND c.lon IS NOT NULL
        """
        
        params = {"start_time": start_time, "end_time": end_time}
        
        if query.zone:
            sql += " AND c.zone = :zone"
            params["zone"] = query.zone
            
        sql += " GROUP BY c.lat, c.lon"
        
        result = await self.db.execute(text(sql), params)
        
        # Aggregate to H3 hexagons
        h3_counts = defaultdict(int)
        for row in result:
            lat, lon, count = row
            if lat is not None and lon is not None:
                h3_index = _h3_cell(lat, lon, resolution)
                h3_counts[h3_index] += count
        
        cells = []
        total = 0
        for h3_index, count in h3_counts.items():
            lat, lon = _h3_center(h3_index)
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
        
        # Simplified query - fetch raw segment data, compute speeds in Python
        # Use subquery to allow filtering by computed column alias
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
            segment_data AS (
                SELECT 
                    vp.prev_camera as origin_camera,
                    vp.camera_id as dest_camera,
                    c1.lat as origin_lat,
                    c1.lon as origin_lon,
                    c2.lat as dest_lat,
                    c2.lon as dest_lon,
                    vp.prev_ts,
                    vp.ts
                FROM vehicle_paths vp
                JOIN cameras c1 ON vp.prev_camera = c1.camera_id
                JOIN cameras c2 ON vp.camera_id = c2.camera_id
                WHERE vp.prev_camera IS NOT NULL
                AND vp.prev_camera != vp.camera_id
                AND vp.ts > vp.prev_ts
            ),
            time_calc AS (
                SELECT 
                    origin_camera,
                    dest_camera,
                    origin_lat,
                    origin_lon,
                    dest_lat,
                    dest_lon,
                    EXTRACT(EPOCH FROM (ts - prev_ts)) / 3600.0 as time_hours
                FROM segment_data
                WHERE ts > prev_ts
            )
            SELECT 
                origin_camera,
                dest_camera,
                origin_lat,
                origin_lon,
                dest_lat,
                dest_lon,
                time_hours
            FROM time_calc
            WHERE time_hours > 0 AND time_hours < 2  -- Filter unrealistic times
        """
        
        params = {"start_time": start_time, "end_time": end_time}
        result = await self.db.execute(text(sql), params)
        
        # Calculate speeds in Python
        segment_map = {}
        for row in result:
            origin, dest, o_lat, o_lon, d_lat, d_lon, time_hours = row
            if None in (o_lat, o_lon, d_lat, d_lon):
                continue
            
            distance_km = haversine_distance(o_lat, o_lon, d_lat, d_lon)
            time_hours_f = float(time_hours)  # PostgreSQL returns Decimal
            if time_hours_f > 0:
                speed_kmph = distance_km / time_hours_f
                if speed_kmph > 200:  # Filter unrealistic speeds
                    continue
                
                key = (origin, dest)
                if key not in segment_map:
                    segment_map[key] = {"speeds": [], "distances": []}
                segment_map[key]["speeds"].append(speed_kmph)
                segment_map[key]["distances"].append(distance_km)
        
        segments = []
        for (origin, dest), data in segment_map.items():
            if len(data["speeds"]) >= 2:
                avg_speed = sum(data["speeds"]) / len(data["speeds"])
                avg_dist = sum(data["distances"]) / len(data["distances"])
                segments.append(SpeedSegment(
                    origin_camera=origin,
                    dest_camera=dest,
                    distance_km=avg_dist,
                    avg_speed_kmph=avg_speed,
                    sample_count=len(data["speeds"])
                ))
        
        segments.sort(key=lambda x: x.avg_speed_kmph)
        
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