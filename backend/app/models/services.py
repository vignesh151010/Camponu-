from datetime import date, datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, Numeric, Text, Boolean, Date, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base


class FeeStatus(str, enum.Enum):
    PAID = "paid"
    PARTIAL = "partial"
    PENDING = "pending"
    OVERDUE = "overdue"


class LoanStatus(str, enum.Enum):
    ACTIVE = "active"
    RETURNED = "returned"
    OVERDUE = "overdue"


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AudienceType(str, enum.Enum):
    ALL = "all"
    DEPARTMENT = "department"
    SECTION = "section"
    STAFF_ONLY = "staff_only"


class Examination(Base):
    __tablename__ = "examinations"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    exam_name = Column(String(120), nullable=False)
    academic_year = Column(String(20), nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)

    course = relationship("Course")
    semester = relationship("Semester")
    schedules = relationship("ExaminationSchedule", back_populates="examination", cascade="all, delete-orphan")


class ExaminationSchedule(Base):
    __tablename__ = "examination_schedules"

    id = Column(Integer, primary_key=True, index=True)
    examination_id = Column(Integer, ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    exam_date = Column(Date, nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    venue = Column(String(60), nullable=False)

    examination = relationship("Examination", back_populates="schedules")
    subject = relationship("Subject")


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    semester_number = Column(Integer, nullable=False)
    academic_year = Column(String(20), nullable=False)
    title = Column(String(120), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=False)

    course = relationship("Course")
    fee_records = relationship("StudentFeeRecord", back_populates="fee_structure", cascade="all, delete-orphan")


class StudentFeeRecord(Base):
    __tablename__ = "student_fee_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id", ondelete="CASCADE"), nullable=False)
    amount_due = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0.0, nullable=False)
    payment_status = Column(Enum(FeeStatus), default=FeeStatus.PENDING, nullable=False)
    last_payment_date = Column(DateTime, nullable=True)
    transaction_ref = Column(String(100), nullable=True)

    __table_args__ = (
        UniqueConstraint("student_id", "fee_structure_id", name="uq_student_fee_structure"),
    )

    student = relationship("StudentProfile", back_populates="fee_records")
    fee_structure = relationship("FeeStructure", back_populates="fee_records")


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    isbn = Column(String(30), unique=True, index=True, nullable=True)
    title = Column(String(200), nullable=False, index=True)
    author = Column(String(150), nullable=False, index=True)
    category = Column(String(80), nullable=True)
    total_copies = Column(Integer, default=5, nullable=False)
    available_copies = Column(Integer, default=5, nullable=False)

    loans = relationship("BookLoan", back_populates="book", cascade="all, delete-orphan")


class BookLoan(Base):
    __tablename__ = "book_loans"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    borrowed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    due_date = Column(Date, nullable=False)
    returned_at = Column(DateTime, nullable=True)
    fine_amount = Column(Numeric(10, 2), default=0.0, nullable=False)
    status = Column(Enum(LoanStatus), default=LoanStatus.ACTIVE, nullable=False)

    book = relationship("Book", back_populates="loans")
    student = relationship("StudentProfile", back_populates="book_loans")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.PENDING, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    student = relationship("StudentProfile", back_populates="leave_requests")
    reviewer = relationship("User")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(60), nullable=False)  # e.g. "Academics", "Fees", "Hostel", "IT"
    subject = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    messages = relationship("SupportTicketMessage", back_populates="ticket", cascade="all, delete-orphan")


class SupportTicketMessage(Base):
    __tablename__ = "support_ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    ticket = relationship("SupportTicket", back_populates="messages")
    user = relationship("User")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    target_audience = Column(Enum(AudienceType), default=AudienceType.ALL, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    author = relationship("User")
    department = relationship("Department")
    section = relationship("Section")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User", back_populates="notifications")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), default="New Conversation", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("ChatSession", back_populates="messages")
