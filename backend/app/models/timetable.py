from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(String(15), nullable=False, index=True)  # "Monday", "Tuesday", etc.
    start_time = Column(String(10), nullable=False)               # "09:00"
    end_time = Column(String(10), nullable=False)                 # "10:00"
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    room_number = Column(String(30), nullable=False)

    __table_args__ = (
        # Ensure a section is not double-booked
        UniqueConstraint("section_id", "day_of_week", "start_time", name="uq_section_time_slot"),
        # Ensure a staff member is not double-booked
        UniqueConstraint("staff_id", "day_of_week", "start_time", name="uq_staff_time_slot"),
        # Ensure a room is not double-booked
        UniqueConstraint("room_number", "day_of_week", "start_time", name="uq_room_time_slot"),
    )

    subject = relationship("Subject", back_populates="timetable_slots")
    staff = relationship("StaffProfile")
    section = relationship("Section")
