from datetime import date, datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    session_date = Column(Date, default=date.today, nullable=False, index=True)
    start_time = Column(String(10), nullable=False)  # e.g. "09:00"
    end_time = Column(String(10), nullable=False)    # e.g. "10:00"
    topic = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("subject_id", "section_id", "session_date", "start_time", name="uq_session_slot"),
    )

    staff = relationship("StaffProfile", back_populates="attendance_sessions")
    subject = relationship("Subject")
    section = relationship("Section")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    remarks = Column(String(200), nullable=True)

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_student_session_record"),
    )

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("StudentProfile", back_populates="attendance_records")
