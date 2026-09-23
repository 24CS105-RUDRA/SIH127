from sqlalchemy import Column, String, Text, DateTime, Boolean, func, Index
from app.db.database import Base


class Blacklist(Base):
    __tablename__ = "blacklist"

    plate_text = Column(String(20), primary_key=True)
    normalized_plate = Column(String(20), nullable=True, index=True)
    reason = Column(Text, nullable=True)
    added_by = Column(String(100), nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index('idx_blacklist_normalized_active', 'normalized_plate', 'is_active'),
    )

    def __repr__(self):
        return f"<Blacklist(plate={self.plate_text}, reason={self.reason})>"