from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from geopy.distance import geodesic
import json
from app.models.alert import Alert
from app.models.blacklist import Blacklist
from app.models.sighting import PlateSighting
from app.models.camera import Camera
from app.schemas.alert import AlertCreate, AlertResponse, AlertStatus, AlertSeverity, AlertType
from app.services.plate_utils import normalize_plate, fuzzy_match_plate, is_plausible_transition
from app.core.config import settings


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_blacklist(self, sighting: PlateSighting) -> Optional[AlertCreate]:
        """Check if a sighting matches any blacklisted plate"""
        norm_plate = normalize_plate(sighting.plate_text)
        
        # Exact match on normalized plate
        result = await self.db.execute(
            select(Blacklist).where(
                and_(
                    Blacklist.normalized_plate == norm_plate,
                    Blacklist.is_active == True,
                    or_(
                        Blacklist.expires_at.is_(None),
                        Blacklist.expires_at > datetime.utcnow()
                    )
                )
            )
        )
        blacklist_entry = result.scalar_one_or_none()
        
        if blacklist_entry:
            return AlertCreate(
                plate_text=sighting.plate_text,
                camera_id=sighting.camera_id,
                alert_type=AlertType.BLACKLIST_HIT,
                severity=AlertSeverity.CRITICAL,
                details={
                    "blacklist_reason": blacklist_entry.reason,
                    "blacklist_added_by": blacklist_entry.added_by,
                    "match_type": "exact_normalized",
                    "sighting_confidence": sighting.confidence
                }
            )
        
        # Fuzzy match
        blacklist_result = await self.db.execute(
            select(Blacklist.plate_text, Blacklist.normalized_plate, Blacklist.reason).where(
                and_(
                    Blacklist.is_active == True,
                    or_(
                        Blacklist.expires_at.is_(None),
                        Blacklist.expires_at > datetime.utcnow()
                    )
                )
            )
        )
        
        blacklist_plates = []
        blacklist_map = {}
        for plate, norm, reason in blacklist_result:
            blacklist_plates.append(plate)
            blacklist_map[plate] = {"normalized": norm, "reason": reason}
        
        if blacklist_plates:
            matches = fuzzy_match_plate(
                sighting.plate_text, 
                blacklist_plates, 
                settings.BLACKLIST_FUZZY_THRESHOLD
            )
            
            if matches:
                best_match = matches[0]
                matched_plate = best_match[0]
                similarity = best_match[1]
                
                entry = blacklist_map[matched_plate]
                return AlertCreate(
                    plate_text=sighting.plate_text,
                    camera_id=sighting.camera_id,
                    alert_type=AlertType.BLACKLIST_HIT,
                    severity=AlertSeverity.HIGH if similarity < 1.0 else AlertSeverity.CRITICAL,
                    details={
                        "blacklist_plate": matched_plate,
                        "blacklist_reason": entry["reason"],
                        "match_type": "fuzzy",
                        "similarity": similarity,
                        "sighting_confidence": sighting.confidence
                    }
                )
        
        return None

    async def check_anomalies(self, sighting: PlateSighting) -> List[AlertCreate]:
        """Check for route anomalies"""
        alerts = []
        
        # Get recent sightings for this plate
        recent_result = await self.db.execute(
            select(PlateSighting).where(
                and_(
                    PlateSighting.plate_text == sighting.plate_text,
                    PlateSighting.ts < sighting.ts,
                    PlateSighting.ts > sighting.ts - timedelta(hours=24)
                )
            ).order_by(PlateSighting.ts.desc()).limit(10)
        )
        recent_sightings = recent_result.scalars().all()
        
        if not recent_sightings:
            return alerts
        
        # Get camera locations
        camera_locations = await self._get_camera_locations()
        
        # Check for impossible speed
        for prev_sighting in recent_sightings:
            if prev_sighting.camera_id == sighting.camera_id:
                continue
                
            time_diff = (sighting.ts - prev_sighting.ts).total_seconds()
            if time_diff <= 0:
                continue
            
            if not is_plausible_transition(
                prev_sighting.camera_id,
                sighting.camera_id,
                time_diff,
                camera_locations,
                settings.ANOMALY_SPEED_THRESHOLD_KMPH
            ):
                alerts.append(AlertCreate(
                    plate_text=sighting.plate_text,
                    camera_id=sighting.camera_id,
                    alert_type=AlertType.ANOMALY,
                    severity=AlertSeverity.HIGH,
                    details={
                        "anomaly_type": "impossible_speed",
                        "prev_camera": prev_sighting.camera_id,
                        "prev_timestamp": prev_sighting.ts.isoformat(),
                        "time_diff_seconds": time_diff,
                        "required_speed_kmph": self._calculate_required_speed(
                            prev_sighting.camera_id,
                            sighting.camera_id,
                            time_diff,
                            camera_locations
                        ),
                        "threshold_kmph": settings.ANOMALY_SPEED_THRESHOLD_KMPH
                    }
                ))
                break  # Only flag once per sighting
        
        # Check for camera skip pattern (potential evasion)
        if len(recent_sightings) >= 2:
            cameras_seen = [s.camera_id for s in recent_sightings] + [sighting.camera_id]
            unique_cameras = len(set(cameras_seen))
            if unique_cameras >= 5 and len(cameras_seen) == unique_cameras:
                # Vehicle seen at many different cameras without repeats
                alerts.append(AlertCreate(
                    plate_text=sighting.plate_text,
                    camera_id=sighting.camera_id,
                    alert_type=AlertType.ANOMALY,
                    severity=AlertSeverity.MEDIUM,
                    details={
                        "anomaly_type": "camera_skip_pattern",
                        "cameras_visited": cameras_seen,
                        "unique_count": unique_cameras
                    }
                ))
        
        return alerts

    def _calculate_required_speed(
        self, 
        cam1: str, 
        cam2: str, 
        time_diff: float,
        locations: Dict[str, tuple]
    ) -> float:
        if cam1 not in locations or cam2 not in locations:
            return 0.0
        dist = geodesic(locations[cam1], locations[cam2]).kilometers
        return (dist / time_diff) * 3600

    async def _get_camera_locations(self) -> Dict[str, tuple]:
        result = await self.db.execute(
            select(Camera.camera_id, Camera.location)
        )
        locations = {}
        for camera_id, location in result:
            if location:
                locations[camera_id] = (location.y, location.x)
        return locations

    async def create_alert(self, alert_data: AlertCreate) -> Alert:
        """Create a new alert"""
        alert = Alert(
            plate_text=alert_data.plate_text,
            camera_id=alert_data.camera_id,
            alert_type=alert_data.alert_type.value,
            severity=alert_data.severity.value,
            status=AlertStatus.NEW.value,
            details=alert_data.details,
            created_at=datetime.utcnow()
        )
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def process_sighting(self, sighting: PlateSighting) -> List[Alert]:
        """Process a sighting for all alert types"""
        alerts = []
        
        # Blacklist check
        blacklist_alert = await self.check_blacklist(sighting)
        if blacklist_alert:
            alert = await self.create_alert(blacklist_alert)
            alerts.append(alert)
        
        # Anomaly checks
        anomaly_alerts = await self.check_anomalies(sighting)
        for anomaly in anomaly_alerts:
            alert = await self.create_alert(anomaly)
            alerts.append(alert)
        
        return alerts

    async def get_alerts(
        self,
        status: Optional[AlertStatus] = None,
        alert_type: Optional[AlertType] = None,
        severity: Optional[AlertSeverity] = None,
        plate_text: Optional[str] = None,
        camera_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50
    ) -> tuple[List[AlertResponse], int]:
        """Get alerts with filters"""
        query = select(Alert)
        
        if status:
            query = query.where(Alert.status == status.value)
        if alert_type:
            query = query.where(Alert.alert_type == alert_type.value)
        if severity:
            query = query.where(Alert.severity == severity.value)
        if plate_text:
            norm_plate = normalize_plate(plate_text)
            query = query.where(
                or_(
                    Alert.plate_text == plate_text,
                    Alert.plate_text.ilike(f"%{plate_text}%")
                )
            )
        if camera_id:
            query = query.where(Alert.camera_id == camera_id)
        if start_time:
            query = query.where(Alert.created_at >= start_time)
        if end_time:
            query = query.where(Alert.created_at <= end_time)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        # Pagination
        query = query.order_by(Alert.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await self.db.execute(query)
        alerts = result.scalars().all()
        
        return [AlertResponse.model_validate(a) for a in alerts], total

    async def acknowledge_alert(self, alert_id: int, user_id: str) -> Optional[AlertResponse]:
        """Acknowledge an alert"""
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        
        if not alert:
            return None
        
        alert.status = AlertStatus.ACKNOWLEDGED.value
        alert.acknowledged_at = datetime.utcnow()
        alert.resolved_by = user_id
        
        await self.db.commit()
        await self.db.refresh(alert)
        return AlertResponse.model_validate(alert)

    async def resolve_alert(self, alert_id: int, user_id: str, note: Optional[str] = None) -> Optional[AlertResponse]:
        """Resolve an alert"""
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        
        if not alert:
            return None
        
        alert.status = AlertStatus.RESOLVED.value
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = user_id
        alert.note = note
        
        await self.db.commit()
        await self.db.refresh(alert)
        return AlertResponse.model_validate(alert)