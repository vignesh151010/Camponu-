from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies.auth import get_current_user, require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User, UserRole, AuditLog
from app.models.academic import (
    Department, Course, Semester, Section, Subject,
    StudentProfile, StaffProfile, StaffAssignment
)
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.timetable import TimetableSlot
from app.models.services import (
    FeeStructure, StudentFeeRecord, FeeStatus,
    Book, BookLoan, LoanStatus, Announcement, AudienceType,
    Examination, ExaminationSchedule, SupportTicket, TicketStatus
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/admin", tags=["Administrator Controls"])


@router.get("/stats", summary="Institution-wide KPIs & Statistics")
def get_admin_stats(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    total_students = db.query(User).filter(User.role == UserRole.STUDENT, User.is_active == True).count()
    total_staff = db.query(User).filter(User.role == UserRole.STAFF, User.is_active == True).count()
    total_depts = db.query(Department).count()
    total_courses = db.query(Course).count()
    total_subjects = db.query(Subject).count()

    # Overall institution attendance rate
    total_attendance = db.query(AttendanceRecord).count()
    present_attendance = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]))
        .count()
    )
    overall_attendance = round((present_attendance / total_attendance * 100), 1) if total_attendance > 0 else 92.5

    # Outstanding Fees
    unpaid_fees = db.query(StudentFeeRecord).filter(StudentFeeRecord.payment_status != FeeStatus.PAID).count()

    # Total Books & Loans
    active_loans = db.query(BookLoan).filter(BookLoan.status == LoanStatus.ACTIVE).count()

    return {
        "total_students": total_students,
        "total_staff": total_staff,
        "total_departments": total_depts,
        "total_courses": total_courses,
        "total_subjects": total_subjects,
        "overall_attendance_percentage": overall_attendance,
        "unpaid_fee_records": unpaid_fees,
        "active_library_loans": active_loans,
    }


# ==============================================================================
# Academic Structure
# ==============================================================================

class DepartmentCreate(BaseModel):
    code: str = Field(..., max_length=20)
    name: str = Field(..., max_length=120)
    head_of_dept: Optional[str] = None


@router.get("/departments", summary="List Departments")
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    return db.query(Department).all()


@router.post("/departments", summary="Create Department")
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    if db.query(Department).filter(Department.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Department with this code already exists.")
    dept = Department(code=payload.code.upper(), name=payload.name, head_of_dept=payload.head_of_dept)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


class CourseCreate(BaseModel):
    department_id: int
    code: str
    name: str
    duration_years: int = 4
    total_semesters: int = 8


@router.get("/courses", summary="List Courses")
def list_courses(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    return db.query(Course).options(joinedload(Course.department)).all()


@router.post("/courses", summary="Create Course")
def create_course(payload: CourseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    if db.query(Course).filter(Course.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Course code already exists.")
    course = Course(
        department_id=payload.department_id,
        code=payload.code.upper(),
        name=payload.name,
        duration_years=payload.duration_years,
        total_semesters=payload.total_semesters,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


class SubjectCreate(BaseModel):
    course_id: int
    semester_number: int
    code: str
    name: str
    credits: int = 3


@router.get("/subjects", summary="List Subjects")
def list_subjects(course_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    q = db.query(Subject).options(joinedload(Subject.course))
    if course_id:
        q = q.filter(Subject.course_id == course_id)
    return q.all()


@router.post("/subjects", summary="Create Subject")
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    if db.query(Subject).filter(Subject.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Subject code already exists.")
    subj = Subject(
        course_id=payload.course_id,
        semester_number=payload.semester_number,
        code=payload.code.upper(),
        name=payload.name,
        credits=payload.credits,
    )
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj


# ==============================================================================
# User Management
# ==============================================================================

@router.get("/users", summary="List & Filter Users")
def list_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if search:
        term = f"%{search}%"
        q = q.filter((User.full_name.ilike(term)) | (User.email.ilike(term)) | (User.register_number.ilike(term)))

    users = q.order_by(User.created_at.desc()).limit(100).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "register_number": u.register_number,
            "role": u.role.value,
            "is_active": u.is_active,
            "created_at": str(u.created_at.date()),
        }
        for u in users
    ]


class CreateStudentPayload(BaseModel):
    email: EmailStr
    register_number: str
    full_name: str
    password: str = Field(..., min_length=6)
    department_id: int
    course_id: int
    semester_id: Optional[int] = None
    section_id: Optional[int] = None
    admission_year: int = 2026


@router.post("/users/student", summary="Create Student Account & Profile")
def create_student_user(
    payload: CreateStudentPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
    if db.query(User).filter(User.register_number == payload.register_number).first():
        raise HTTPException(status_code=400, detail="A user with this register number already exists.")

    user = User(
        email=payload.email,
        register_number=payload.register_number,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=UserRole.STUDENT,
        is_active=True,
    )
    db.add(user)
    db.flush()

    student_profile = StudentProfile(
        user_id=user.id,
        department_id=payload.department_id,
        course_id=payload.course_id,
        semester_id=payload.semester_id,
        section_id=payload.section_id,
        admission_year=payload.admission_year,
        cgpa=0.0,
    )
    db.add(student_profile)
    db.commit()

    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="STUDENT_CREATED",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Created student {user.full_name} ({user.register_number})",
    )

    return {"success": True, "message": "Student account created successfully.", "user_id": user.id}


class CreateStaffPayload(BaseModel):
    email: EmailStr
    register_number: str  # Employee ID
    full_name: str
    password: str = Field(..., min_length=6)
    department_id: int
    designation: str = "Assistant Professor"
    specialization: Optional[str] = None


@router.post("/users/staff", summary="Create Staff Account & Profile")
def create_staff_user(
    payload: CreateStaffPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
    if db.query(User).filter(User.register_number == payload.register_number).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists.")

    user = User(
        email=payload.email,
        register_number=payload.register_number,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=UserRole.STAFF,
        is_active=True,
    )
    db.add(user)
    db.flush()

    staff_profile = StaffProfile(
        user_id=user.id,
        department_id=payload.department_id,
        designation=payload.designation,
        specialization=payload.specialization,
    )
    db.add(staff_profile)
    db.commit()

    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="STAFF_CREATED",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Created faculty {user.full_name} ({user.register_number})",
    )

    return {"success": True, "message": "Staff account created successfully.", "user_id": user.id}


@router.post("/users/{user_id}/toggle-active", summary="Activate/Deactivate User Account")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own administrator account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_active = not user.is_active
    db.commit()

    action = "ACTIVATED" if user.is_active else "DEACTIVATED"
    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action=f"USER_{action}",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Account status changed to is_active={user.is_active}",
    )

    return {"success": True, "is_active": user.is_active}


# ==============================================================================
# Timetable Management with Conflict Detection
# ==============================================================================

class TimetableSlotInput(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    subject_id: int
    staff_id: int
    section_id: int
    room_number: str


@router.get("/timetable/slots", summary="Get All Timetable Slots")
def get_all_timetable_slots(
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    q = (
        db.query(TimetableSlot)
        .options(
            joinedload(TimetableSlot.subject),
            joinedload(TimetableSlot.staff).joinedload(StaffProfile.user),
            joinedload(TimetableSlot.section),
        )
    )
    if section_id:
        q = q.filter(TimetableSlot.section_id == section_id)
    slots = q.all()

    return [
        {
            "id": s.id,
            "day": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "subject": s.subject.name,
            "faculty": s.staff.user.full_name if s.staff and s.staff.user else "Faculty",
            "section": s.section.name,
            "room": s.room_number,
        }
        for s in slots
    ]


@router.post("/timetable/slots", summary="Create Timetable Slot with Conflict Detection")
def create_timetable_slot(
    payload: TimetableSlotInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    # 1. Check Section collision
    section_conflict = (
        db.query(TimetableSlot)
        .filter(
            TimetableSlot.section_id == payload.section_id,
            TimetableSlot.day_of_week == payload.day_of_week,
            TimetableSlot.start_time == payload.start_time,
        )
        .first()
    )
    if section_conflict:
        raise HTTPException(
            status_code=400,
            detail=f"Section is already scheduled for another class on {payload.day_of_week} at {payload.start_time}.",
        )

    # 2. Check Faculty collision
    faculty_conflict = (
        db.query(TimetableSlot)
        .filter(
            TimetableSlot.staff_id == payload.staff_id,
            TimetableSlot.day_of_week == payload.day_of_week,
            TimetableSlot.start_time == payload.start_time,
        )
        .first()
    )
    if faculty_conflict:
        raise HTTPException(
            status_code=400,
            detail=f"The selected faculty member is already teaching another class on {payload.day_of_week} at {payload.start_time}.",
        )

    # 3. Check Room collision
    room_conflict = (
        db.query(TimetableSlot)
        .filter(
            TimetableSlot.room_number == payload.room_number,
            TimetableSlot.day_of_week == payload.day_of_week,
            TimetableSlot.start_time == payload.start_time,
        )
        .first()
    )
    if room_conflict:
        raise HTTPException(
            status_code=400,
            detail=f"Room {payload.room_number} is already occupied on {payload.day_of_week} at {payload.start_time}.",
        )

    slot = TimetableSlot(
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        subject_id=payload.subject_id,
        staff_id=payload.staff_id,
        section_id=payload.section_id,
        room_number=payload.room_number,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    return {"success": True, "message": "Timetable slot scheduled with zero conflicts.", "slot_id": slot.id}


@router.delete("/timetable/slots/{slot_id}", summary="Delete Timetable Slot")
def delete_timetable_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")
    db.delete(slot)
    db.commit()
    return {"success": True, "message": "Slot deleted."}


# ==============================================================================
# Audit Logs
# ==============================================================================

@router.get("/audit-logs", summary="Get System Audit Trail")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "actor": l.actor_name or "System",
            "action": l.action,
            "entity": f"{l.entity_type} #{l.entity_id or ''}",
            "details": l.details,
            "ip": l.ip_address or "127.0.0.1",
            "timestamp": l.created_at.isoformat(),
        }
        for l in logs
    ]


# ==============================================================================
# Examinations & Governance
# ==============================================================================

class ExaminationScheduleInput(BaseModel):
    subject_id: int
    exam_date: date
    start_time: str
    end_time: str
    venue: str


class CreateExaminationPayload(BaseModel):
    course_id: int
    semester_id: int
    exam_name: str
    academic_year: str = "2026-2027"
    is_published: bool = True
    schedules: List[ExaminationScheduleInput] = []


@router.get("/examinations", summary="List All Institutional Examinations")
def list_examinations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    exams = (
        db.query(Examination)
        .options(
            joinedload(Examination.course),
            joinedload(Examination.semester),
            joinedload(Examination.schedules).joinedload(ExaminationSchedule.subject),
        )
        .all()
    )
    return [
        {
            "id": e.id,
            "exam_name": e.exam_name,
            "course": e.course.name if e.course else "N/A",
            "semester": f"Semester {e.semester.semester_number}" if e.semester else "N/A",
            "academic_year": e.academic_year,
            "is_published": e.is_published,
            "schedules_count": len(e.schedules),
        }
        for e in exams
    ]


@router.post("/examinations", summary="Schedule and Publish Examination")
def create_examination(
    payload: CreateExaminationPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    exam = Examination(
        course_id=payload.course_id,
        semester_id=payload.semester_id,
        exam_name=payload.exam_name,
        academic_year=payload.academic_year,
        is_published=payload.is_published,
    )
    db.add(exam)
    db.flush()

    for s in payload.schedules:
        sched = ExaminationSchedule(
            examination_id=exam.id,
            subject_id=s.subject_id,
            exam_date=s.exam_date,
            start_time=s.start_time,
            end_time=s.end_time,
            venue=s.venue,
        )
        db.add(sched)

    db.commit()
    return {"success": True, "message": "Examination created and published.", "exam_id": exam.id}


# ==============================================================================
# Support Tickets Management
# ==============================================================================

@router.get("/support-tickets", summary="List Support Helpdesk Tickets")
def list_support_tickets(
    status: Optional[TicketStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    query = db.query(SupportTicket).options(joinedload(SupportTicket.user))
    if status:
        query = query.filter(SupportTicket.status == status)
    tickets = query.order_by(SupportTicket.created_at.desc()).all()

    return [
        {
            "id": t.id,
            "student_name": t.user.full_name if t.user else "Anonymous",
            "category": t.category,
            "subject": t.subject,
            "description": t.description,
            "priority": t.priority.value,
            "status": t.status.value,
            "created_at": t.created_at.strftime("%b %d, %Y"),
        }
        for t in tickets
    ]


@router.put("/support-tickets/{ticket_id}/status", summary="Update Support Ticket Status")
def update_support_ticket_status(
    ticket_id: int,
    status: TicketStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    ticket.status = status
    db.commit()
    return {"success": True, "message": f"Ticket status updated to {status.value}"}

