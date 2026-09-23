from sqlalchemy import Column, BigInteger, String, Integer, Float, DateTime, ForeignKey, func, Index, Text
from app.db.database import Base


class AnalyticsDensity(Base):
    __tablename__ = "analytics_density"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id"), nullable=False, index=True)
    zone = Column(String(50), nullable=True, index=True)
    vehicle_count = Column(Integer, nullable=False)
    bucket_start = Column(DateTime(timezone=True), nullable=False, index=True)
    bucket_end = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index('idx_analytics_density_camera_bucket', 'camera_id', 'bucket_start'),
        Index('idx_analytics_density_zone_bucket', 'zone', 'bucket_start'),
    )

    def __repr__(self):
        return f"<AnalyticsDensity(camera={self.camera_id}, count={self.vehicle_count}, bucket={self.bucket_start})>"


class AnalyticsODMatrix(Base):
    __tablename__ = "analytics_od_matrix"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    origin_camera = Column(String(50), ForeignKey("cameras.camera_id"), nullable=False, index=True)
    origin_zone = Column(String(50), nullable=True, index=True)
    dest_camera = Column(String(50), ForeignKey("cameras.camera_id"), nullable=False, index=True)
    dest_zone = Column(String(50), nullable=True, index=True)
    vehicle_count = Column(Integer, nullable=False)
    bucket_start = Column(DateTime(timezone=True), nullable=False, index=True)
    bucket_end = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index('idx_analytics_od_origin_bucket', 'origin_camera', 'bucket_start'),
        Index('idx_analytics_od_dest_bucket', 'dest_camera', 'bucket_start'),
    )

    def __repr__(self):
        return f"<AnalyticsODMatrix(origin={self.origin_camera}, dest={self.dest_camera}, count={self.vehicle_count})>"


class AnalyticsCongestion(Base):
    __tablename__ = "analytics_congestion"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id"), nullable=False, index=True)
    zone = Column(String(50), nullable=True, index=True)
    density_score = Column(Float, nullable=False)
    avg_speed = Column(Float, nullable=True)
    congestion_level = Column(String(20), nullable=False)  # normal, watch, congested
    z_score = Column(Float, nullable=True)
    bucket_start = Column(DateTime(timezone=True), nullable=False, index=True)
    bucket_end = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index('idx_analytics_congestion_camera_bucket', 'camera_id', 'bucket_start'),
    )

    def __repr__(self):
        return f"<AnalyticsCongestion(camera={self.camera_id}, level={self.congestion_level}, z={self.z_score})>"


class AnalyticsHeatmap(Base):
    __tablename__ = "analytics_heatmap"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    h3_index = Column(String(50), nullable=False, index=True)
    vehicle_count = Column(Integer, nullable=False)
    bucket_start = Column(DateTime(timezone=True), nullable=False, index=True)
    bucket_end = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index('idx_analytics_heatmap_h3_bucket', 'h3_index', 'bucket_start'),
    )

    def __repr__(self):
        return f"<AnalyticsHeatmap(h3={self.h3_index}, count={self.vehicle_count}, bucket={self.bucket_start})>"


class CameraMetrics(Base):
    __tablename__ = "camera_metrics"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id"), nullable=False, index=True)
    metric_type = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    ts = Column(DateTime(timezone=True), nullable=False, index=True)

    __table_args__ = (
        Index('idx_camera_metrics_camera_type_ts', 'camera_id', 'metric_type', 'ts'),
    )

    def __repr__(self):
        return f"<CameraMetrics(camera={self.camera_id}, type={self.metric_type}, value={self.value})>"