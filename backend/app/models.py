import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class School(Base):
    __tablename__ = "schools"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    district = Column(String(100), nullable=False)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Profile metrics
    student_count = Column(Integer, default=450)
    teacher_count = Column(Integer, default=30)
    classroom_count = Column(Integer, default=18)
    school_type = Column(String(100), default="Anadolu Lisesi")
    principal_name = Column(String(100), default="Okul Müdürü")
    phone = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    surplus_items = relationship("SurplusItem", back_populates="school")
    need_requests = relationship("NeedRequest", back_populates="school")
    transfers_sent = relationship("Transfer", foreign_keys="Transfer.from_school_id", back_populates="from_school")
    transfers_received = relationship("Transfer", foreign_keys="Transfer.to_school_id", back_populates="to_school")


class SurplusItem(Base):
    __tablename__ = "surplus_items"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    school_id = Column(String(64), ForeignKey("schools.id"), nullable=False)
    title = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False)
    item_category = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    allocated_quantity = Column(Integer, default=0)
    condition_rating = Column(String(50), default="İyi") # 'Yeni', 'İyi', 'Az Kullanılmış', 'Bakım Gerektirir'
    image_url = Column(Text, nullable=True)
    estimated_unit_value_tl = Column(Float, default=1000.0)
    status = Column(String(50), default="AVAILABLE") # AVAILABLE, MATCHED, TRANSFERRED
    created_at = Column(DateTime, default=datetime.utcnow)

    school = relationship("School", back_populates="surplus_items")
    transfers = relationship("Transfer", back_populates="surplus_item")


class NeedRequest(Base):
    __tablename__ = "need_requests"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    school_id = Column(String(64), ForeignKey("schools.id"), nullable=False)
    title = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False)
    item_category = Column(String(100), nullable=False)
    quantity_needed = Column(Integer, nullable=False, default=1)
    urgency_level = Column(String(50), default="MEDIUM") # HIGH, MEDIUM, LOW
    status = Column(String(50), default="OPEN") # OPEN, MATCHED, FULFILLED
    created_at = Column(DateTime, default=datetime.utcnow)

    school = relationship("School", back_populates="need_requests")


class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    task_type = Column(String(50), nullable=False) # MATCH_SURPLUS, MATCH_NEED
    source_id = Column(String(64), nullable=False) # surplus_item_id or need_request_id
    status = Column(String(50), default="PENDING") # PENDING, PROCESSING, AWAITING_HUMAN_APPROVAL, COMPLETED, REJECTED
    match_payload = Column(JSON, nullable=True) # Full details for HITL card
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    task_id = Column(String(64), nullable=True)
    surplus_item_id = Column(String(64), ForeignKey("surplus_items.id"), nullable=True)
    from_school_id = Column(String(64), ForeignKey("schools.id"), nullable=False)
    to_school_id = Column(String(64), ForeignKey("schools.id"), nullable=False)
    item_summary = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    estimated_savings_tl = Column(Float, default=0.0)
    prevented_co2_kg = Column(Float, default=0.0)
    protocol_code = Column(String(64), nullable=True)
    status = Column(String(50), default="APPROVED")
    transferred_at = Column(DateTime, default=datetime.utcnow)

    surplus_item = relationship("SurplusItem", back_populates="transfers")
    from_school = relationship("School", foreign_keys=[from_school_id], back_populates="transfers_sent")
    to_school = relationship("School", foreign_keys=[to_school_id], back_populates="transfers_received")
