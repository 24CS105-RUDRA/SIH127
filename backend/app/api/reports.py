from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from app.db.database import get_db
from app.models.sighting import PlateSighting
from app.models.camera import Camera
from app.models.alert import Alert
from app.services.analytics import AnalyticsService
from app.services.trajectory import TrajectoryService
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate")
async def generate_report(
    report_type: str = Query(..., description="Type: daily_summary, trajectory, alert_log, congestion"),
    plate: Optional[str] = Query(None),
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    format: str = Query("csv", description="csv or pdf"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """Generate a report asynchronously"""
    import uuid
    job_id = str(uuid.uuid4())
    
    # Start background task
    background_tasks.add_task(
        _generate_report_task,
        job_id, report_type, plate, start_time, end_time, format
    )
    
    return {"job_id": job_id, "status": "processing"}


async def _generate_report_task(
    job_id: str,
    report_type: str,
    plate: Optional[str],
    start_time: datetime,
    end_time: datetime,
    format: str
):
    """Background task to generate report"""
    # In a real implementation, this would store the report to a file/storage
    # and update a job status table
    pass


@router.get("/daily-summary")
async def daily_traffic_summary(
    date: datetime = Query(...),
    format: str = Query("csv"),
    db: AsyncSession = Depends(get_db)
):
    """Generate daily traffic summary report"""
    from datetime import timedelta
    
    day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    
    service = AnalyticsService(db)
    
    # Get KPIs
    kpis = await service.get_kpis()
    
    # Get density
    density = await service.get_density(
        app.schemas.analytics.AnalyticsQuery(
            time_range=app.schemas.analytics.TimeRange.TWENTY_FOUR_HOURS,
            start_time=day_start,
            end_time=day_end
        )
    )
    
    # Get OD matrix
    od_matrix = await service.get_od_matrix(
        app.schemas.analytics.AnalyticsQuery(
            time_range=app.schemas.analytics.TimeRange.TWENTY_FOUR_HOURS,
            start_time=day_start,
            end_time=day_end
        )
    )
    
    # Get congestion
    congestion = await service.get_congestion(
        app.schemas.analytics.AnalyticsQuery(
            time_range=app.schemas.analytics.TimeRange.TWENTY_FOUR_HOURS,
            start_time=day_start,
            end_time=day_end
        )
    )
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # KPIs
        writer.writerow(["Daily Traffic Summary", date.date().isoformat()])
        writer.writerow([])
        writer.writerow(["KPI", "Value"])
        writer.writerow(["Total Vehicles", kpis.total_vehicles_today])
        writer.writerow(["Active Cameras", kpis.active_cameras])
        writer.writerow(["Total Cameras", kpis.total_cameras])
        writer.writerow(["Active Alerts", kpis.active_alerts])
        writer.writerow(["Avg City Speed (km/h)", kpis.avg_city_speed_kmph or "N/A"])
        writer.writerow([])
        
        # Density
        writer.writerow(["Camera Density"])
        writer.writerow(["Camera ID", "Zone", "Vehicle Count", "Bucket Start", "Bucket End"])
        for d in density.data:
            writer.writerow([d.camera_id, d.zone or "", d.vehicle_count, 
                           d.bucket_start.isoformat(), d.bucket_end.isoformat()])
        writer.writerow([])
        
        # OD Matrix
        writer.writerow(["Origin-Destination Matrix"])
        writer.writerow(["Origin Camera", "Origin Zone", "Dest Camera", "Dest Zone", "Vehicle Count"])
        for od in od_matrix.matrix:
            writer.writerow([od.origin_camera, od.origin_zone or "", 
                           od.dest_camera, od.dest_zone or "", od.vehicle_count])
        writer.writerow([])
        
        # Congestion
        writer.writerow(["Congestion"])
        writer.writerow(["Camera ID", "Zone", "Density Score", "Avg Speed", "Level", "Z-Score"])
        for c in congestion.data:
            writer.writerow([c.camera_id, c.zone or "", c.density_score, 
                           c.avg_speed or "", c.congestion_level, c.z_score or ""])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=daily_summary_{date.date()}.csv"}
        )
    
    # JSON response
    return {
        "date": date.date().isoformat(),
        "kpis": kpis.model_dump(),
        "density": density.model_dump(),
        "od_matrix": od_matrix.model_dump(),
        "congestion": congestion.model_dump()
    }


@router.get("/trajectory/{plate}")
async def trajectory_report(
    plate: str,
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    format: str = Query("csv"),
    db: AsyncSession = Depends(get_db)
):
    """Generate trajectory report for a plate"""
    service = TrajectoryService(db)
    trajectory = await service.get_trajectory(plate, start_time, end_time)
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Trajectory Report", plate])
        writer.writerow(["Start", trajectory.start_time.isoformat()])
        writer.writerow(["End", trajectory.end_time.isoformat()])
        writer.writerow(["Total Distance (km)", trajectory.total_distance_km or ""])
        writer.writerow(["Avg Speed (km/h)", trajectory.avg_speed_kmph or ""])
        writer.writerow(["Sighting Count", trajectory.sighting_count])
        writer.writerow([])
        writer.writerow(["Camera ID", "Zone", "Timestamp", "Lat", "Lon", "Plate", "Confidence", "Speed (km/h)", "Direction"])
        
        for point in trajectory.points:
            writer.writerow([
                point.camera_id,
                point.camera_zone or "",
                point.timestamp.isoformat(),
                point.lat,
                point.lon,
                point.plate_text,
                point.confidence or "",
                point.speed_kmph or "",
                point.direction or ""
            ])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=trajectory_{plate}_{start_time.date()}.csv"}
        )
    
    return trajectory.model_dump()


@router.get("/alerts")
async def alert_log_report(
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    severity: Optional[str] = Query(None),
    format: str = Query("csv"),
    db: AsyncSession = Depends(get_db)
):
    """Generate alert log report"""
    from app.services.alerts import AlertService
    from app.schemas.alert import AlertStatus, AlertType, AlertSeverity
    
    service = AlertService(db)
    
    sev = None
    if severity:
        try:
            sev = AlertSeverity(severity)
        except:
            pass
    
    alerts, _ = await service.get_alerts(
        severity=sev,
        start_time=start_time,
        end_time=end_time,
        page=1,
        page_size=10000
    )
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Alert Log Report"])
        writer.writerow(["Start", start_time.isoformat()])
        writer.writerow(["End", end_time.isoformat()])
        writer.writerow([])
        writer.writerow(["ID", "Timestamp", "Plate", "Camera", "Type", "Severity", "Status", "Details"])
        
        for alert in alerts:
            writer.writerow([
                alert.id,
                alert.created_at.isoformat(),
                alert.plate_text,
                alert.camera_id or "",
                alert.alert_type,
                alert.severity,
                alert.status,
                str(alert.details) if alert.details else ""
            ])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=alerts_{start_time.date()}_{end_time.date()}.csv"}
        )
    
    return [a.model_dump() for a in alerts]


@router.get("/congestion")
async def congestion_report(
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    format: str = Query("csv"),
    db: AsyncSession = Depends(get_db)
):
    """Generate congestion analysis report"""
    service = AnalyticsService(db)
    
    congestion = await service.get_congestion(
        app.schemas.analytics.AnalyticsQuery(
            time_range=app.schemas.analytics.TimeRange.CUSTOM,
            start_time=start_time,
            end_time=end_time
        )
    )
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Congestion Analysis Report"])
        writer.writerow(["Start", start_time.isoformat()])
        writer.writerow(["End", end_time.isoformat()])
        writer.writerow([])
        writer.writerow(["Camera ID", "Zone", "Density Score", "Avg Speed", "Level", "Z-Score"])
        
        for c in congestion.data:
            writer.writerow([c.camera_id, c.zone or "", c.density_score, 
                           c.avg_speed or "", c.congestion_level, c.z_score or ""])
        
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=congestion_{start_time.date()}_{end_time.date()}.csv"}
        )
    
    return congestion.model_dump()