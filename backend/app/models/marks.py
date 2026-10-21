from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class AssessmentType(str, enum.Enum):
    INTERNAL_1 = "internal_1"
    INTERNAL_2 = "internal_2"
    ASSIGNMENT = "assignment"
    QUIZ = "quiz"
    SEMESTER_FINAL = "semester_final"


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(120), nullable=False)
    assessment_type = Column(Enum(AssessmentType), default=AssessmentType.INTERNAL_1, nullable=False)
    max_marks = Column(Float, default=100.0, nullable=False)
    weightage_percent = Column(Float, default=20.0, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    subject = relationship("Subject")
    section = relationship("Section")
    staff = relationship("StaffProfile")
    marks = relationship("Mark", back_populates="assessment", cascade="all, delete-orphan")


class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    score_obtained = Column(Float, nullable=False)
    grade = Column(String(5), nullable=True)  # e.g. "A+", "A", "B", "F"
    feedback = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("assessment_id", "student_id", name="uq_assessment_student_mark"),
    )

    assessment = relationship("Assessment", back_populates="marks")
    student = relationship("StudentProfile", back_populates="marks")
