from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False)
    head_of_dept = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    courses = relationship("Course", back_populates="department", cascade="all, delete-orphan")
    students = relationship("StudentProfile", back_populates="department")
    staff = relationship("StaffProfile", back_populates="department")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False)
    duration_years = Column(Integer, default=4, nullable=False)
    total_semesters = Column(Integer, default=8, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    department = relationship("Department", back_populates="courses")
    semesters = relationship("Semester", back_populates="course", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="course", cascade="all, delete-orphan")
    students = relationship("StudentProfile", back_populates="course")


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_number = Column(Integer, nullable=False)
    academic_year = Column(String(20), nullable=False)  # e.g. "2026-2027"

    course = relationship("Course", back_populates="semesters")
    sections = relationship("Section", back_populates="semester", cascade="all, delete-orphan")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(20), nullable=False)  # e.g. "A", "B"
    capacity = Column(Integer, default=60, nullable=False)

    semester = relationship("Semester", back_populates="sections")
    students = relationship("StudentProfile", back_populates="section")
    staff_assignments = relationship("StaffAssignment", back_populates="section")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    semester_number = Column(Integer, nullable=False, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False)
    credits = Column(Integer, default=3, nullable=False)

    course = relationship("Course", back_populates="subjects")
    staff_assignments = relationship("StaffAssignment", back_populates="subject")
    timetable_slots = relationship("TimetableSlot", back_populates="subject")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)
    admission_year = Column(Integer, nullable=False)
    cgpa = Column(Float, default=0.0, nullable=False)

    user = relationship("User", back_populates="student_profile")
    department = relationship("Department", back_populates="students")
    course = relationship("Course", back_populates="students")
    section = relationship("Section", back_populates="students")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    marks = relationship("Mark", back_populates="student", cascade="all, delete-orphan")
    assignment_submissions = relationship("AssignmentSubmission", back_populates="student", cascade="all, delete-orphan")
    fee_records = relationship("StudentFeeRecord", back_populates="student", cascade="all, delete-orphan")
    book_loans = relationship("BookLoan", back_populates="student", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="student", cascade="all, delete-orphan")


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    designation = Column(String(80), default="Assistant Professor", nullable=False)
    qualification = Column(String(80), nullable=True)
    specialization = Column(String(120), nullable=True)

    user = relationship("User", back_populates="staff_profile")
    department = relationship("Department", back_populates="staff")
    assignments = relationship("StaffAssignment", back_populates="staff", cascade="all, delete-orphan")
    attendance_sessions = relationship("AttendanceSession", back_populates="staff")


class StaffAssignment(Base):
    __tablename__ = "staff_assignments"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year = Column(String(20), nullable=False)

    staff = relationship("StaffProfile", back_populates="assignments")
    subject = relationship("Subject", back_populates="staff_assignments")
    section = relationship("Section", back_populates="staff_assignments")
