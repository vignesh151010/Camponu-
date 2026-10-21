from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class SubmissionStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    GRADED = "graded"
    LATE = "late"


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False, index=True)
    max_score = Column(Float, default=100.0, nullable=False)
    attachment_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    subject = relationship("Subject")
    section = relationship("Section")
    staff = relationship("StaffProfile")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_text = Column(Text, nullable=True)
    file_path = Column(String(255), nullable=True)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.SUBMITTED, nullable=False)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_student_sub"),
    )

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("StudentProfile", back_populates="assignment_submissions")


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    subject = relationship("Subject")
    staff = relationship("StaffProfile")
