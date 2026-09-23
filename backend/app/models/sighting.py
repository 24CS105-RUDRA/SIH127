from sqlalchemy import Column, BigInteger, String, Text, Float, DateTime, func, Index, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database import Base


class PlateSighting(Base):
    __tablename__ = "plate_sightings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plate_text = Column(String(20), nullable=False, index=True)
    normalized_plate = Column(String(20), nullable=True, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id"), nullable=False, index=True)
    confidence = Column(Float, nullable=True)
    snapshot_url = Column(Text, nullable=True)
    bbox = Column(JSONB, nullable=True)
    ts = Column(DateTime(timezone=True), nullable=False, index=True)

    __table_args__ = (
        Index('idx_plate_sightings_plate_ts', 'plate_text', 'ts'),
        Index('idx_plate_sightings_camera_ts', 'camera_id', 'ts'),
        Index('idx_plate_sightings_normalized_ts', 'normalized_plate', 'ts'),
    )

    def __repr__(self):
        return f"<PlateSighting(plate={self.plate_text}, camera={self.camera_id}, ts={self.ts})>"