from sqlalchemy import Column, String, Text, DateTime, func, Float
from app.db.database import Base


class Camera(Base):
    __tablename__ = "cameras"

    camera_id = Column(String(50), primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    zone = Column(String(50), nullable=True, index=True)
    direction = Column(String(50), nullable=True)
    status = Column(String(20), default='online', nullable=False)
    stream_url = Column(Text, nullable=True)
    installed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<Camera(camera_id={self.camera_id}, zone={self.zone})>"