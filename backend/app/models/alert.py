from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey, func, Index, JSON
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plate_text = Column(String(20), nullable=False, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id"), nullable=True, index=True)
    alert_type = Column(String(50), nullable=False)  # blacklist_hit, anomaly, system
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    status = Column(String(20), default='new', nullable=False)  # new, acknowledged, resolved
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    note = Column(Text, nullable=True)

    __table_args__ = (
        Index('idx_alerts_status_created', 'status', 'created_at'),
        Index('idx_alerts_severity_created', 'severity', 'created_at'),
    )

    def __repr__(self):
        return f"<Alert(id={self.id}, plate={self.plate_text}, type={self.alert_type}, severity={self.severity})>"