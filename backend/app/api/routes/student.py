from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies.auth import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.academic import Department, Course, Semester, Section, Subject, StudentProfile, StaffProfile
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.models.marks import Assessment, Mark
from app.models.timetable import TimetableSlot
from app.models.assignment import Assignment, AssignmentSubmission, StudyMaterial, SubmissionStatus
from app.models.services import (
    Examination, ExaminationSchedule, FeeStructure, StudentFeeRecord,
    Book, BookLoan, LeaveRequest, LeaveStatus, SupportTicket, SupportTicketMessage,
    Announcement, AudienceType, TicketPriority, TicketStatus
)

router = APIRouter(prefix="/student", tags=["Student Portal"])


def get_student_profile(current_user: User = Depends(require_role(UserRole.STUDENT)), db: Session = Depends(get_db)) -> StudentProfile:
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student academic profile not found.")
    return profile


@router.get("/overview", summary="Student Academic Dashboard Overview")
def get_student_overview(
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    # Calculate Attendance
    total_records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).count()
    present_records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]))
        .count()
    )
    attendance_pct = round((present_records / total_records * 100), 1) if total_records > 0 else 100.0

    # Pending Assignments
    submitted_ids = [
        sub.assignment_id for sub in db.query(AssignmentSubmission.assignment_id).filter(AssignmentSubmission.student_id == student.id).all()
    ]
    pending_assignments = (
        db.query(Assignment)
        .filter(
            Assignment.section_id == student.section_id,
            Assignment.due_date >= datetime.now(timezone.utc),
            ~Assignment.id.in_(submitted_ids) if submitted_ids else True,
        )
        .count()
    )

    # Today's timetable slots
    today_day = datetime.now().strftime("%A")
    today_classes = (
        db.query(TimetableSlot)
        .options(joinedload(TimetableSlot.subject), joinedload(TimetableSlot.staff))
        .filter(TimetableSlot.section_id == student.section_id, TimetableSlot.day_of_week == today_day)
        .order_by(TimetableSlot.start_time.asc())
        .all()
    )

    # Recent Published Marks
    recent_marks = (
        db.query(Mark)
        .join(Assessment)
        .options(joinedload(Mark.assessment).joinedload(Assessment.subject))
        .filter(Mark.student_id == student.id, Assessment.is_published == True)
        .order_by(Mark.id.desc())
        .limit(5)
        .all()
    )

    # Announcements
    announcements = (
        db.query(Announcement)
        .filter(
            (Announcement.target_audience == AudienceType.ALL)
            | ((Announcement.target_audience == AudienceType.DEPARTMENT) & (Announcement.department_id == student.department_id))
            | ((Announcement.target_audience == AudienceType.SECTION) & (Announcement.section_id == student.section_id))
        )
        .order_by(Announcement.created_at.desc())
        .limit(4)
        .all()
    )

    # Department & Course info
    dept = db.query(Department).filter(Department.id == student.department_id).first()
    course = db.query(Course).filter(Course.id == student.course_id).first()
    section = db.query(Section).filter(Section.id == student.section_id).first() if student.section_id else None

    return {
        "student": {
            "full_name": current_user.full_name,
            "email": current_user.email,
            "register_number": current_user.register_number,
            "department": dept.name if dept else "N/A",
            "course": course.name if course else "N/A",
            "section": section.name if section else "N/A",
            "cgpa": student.cgpa,
        },
        "stats": {
            "attendance_percentage": attendance_pct,
            "attendance_warning": attendance_pct < 75.0,
            "total_classes": total_records,
            "attended_classes": present_records,
            "pending_assignments_count": pending_assignments,
        },
        "recent_marks": [
            {
                "subject": m.assessment.subject.name,
                "assessment": m.assessment.title,
                "score": m.score_obtained,
                "max_marks": m.assessment.max_marks,
                "grade": m.grade or "N/A",
            }
            for m in recent_marks
        ],
        "announcements": [
            {"id": a.id, "title": a.title, "content": a.content, "created_at": a.created_at}
            for a in announcements
        ],
    }


@router.get("/attendance", summary="Student Attendance Detailed Analytics")
def get_student_attendance(
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    # Subject-wise attendance calculation
    records = (
        db.query(AttendanceRecord)
        .join(AttendanceSession)
        .options(joinedload(AttendanceRecord.session).joinedload(AttendanceSession.subject))
        .filter(AttendanceRecord.student_id == student.id)
        .order_by(AttendanceSession.session_date.desc())
        .all()
    )

    subject_stats = {}
    history = []

    for r in records:
        subj = r.session.subject
        if subj.id not in subject_stats:
            subject_stats[subj.id] = {
                "subject_code": subj.code,
                "subject_name": subj.name,
                "total": 0,
                "present": 0,
                "absent": 0,
                "late": 0,
                "excused": 0,
            }
        subject_stats[subj.id]["total"] += 1
        if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE]:
            subject_stats[subj.id]["present"] += 1
        elif r.status == AttendanceStatus.ABSENT:
            subject_stats[subj.id]["absent"] += 1
        elif r.status == AttendanceStatus.EXCUSED:
            subject_stats[subj.id]["excused"] += 1

        history.append({
            "id": r.id,
            "date": str(r.session.session_date),
            "subject": subj.name,
            "time": f"{r.session.start_time} - {r.session.end_time}",
            "topic": r.session.topic or "Regular Lecture",
            "status": r.status.value,
        })

    results = []
    overall_total = 0
    overall_present = 0

    for s_id, s in subject_stats.items():
        pct = round((s["present"] / s["total"] * 100), 1) if s["total"] > 0 else 100.0
        overall_total += s["total"]
        overall_present += s["present"]
        results.append({
            **s,
            "percentage": pct,
            "is_shortage": pct < 75.0,
        })

    overall_pct = round((overall_present / overall_total * 100), 1) if overall_total > 0 else 100.0

    return {
        "overall_percentage": overall_pct,
        "is_shortage": overall_pct < 75.0,
        "total_sessions": overall_total,
        "present_count": overall_present,
        "subjects": results,
        "history": history[:50],  # Latest 50 sessions
    }


@router.get("/marks", summary="Student Published Academic Marks & Grades")
def get_student_marks(
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    marks = (
        db.query(Mark)
        .join(Assessment)
        .options(joinedload(Mark.assessment).joinedload(Assessment.subject))
        .filter(Mark.student_id == student.id, Assessment.is_published == True)
        .order_by(Assessment.created_at.desc())
        .all()
    )

    items = []
    for m in marks:
        items.append({
            "id": m.id,
            "subject_code": m.assessment.subject.code,
            "subject_name": m.assessment.subject.name,
            "assessment_title": m.assessment.title,
            "assessment_type": m.assessment.assessment_type.value,
            "score_obtained": m.score_obtained,
            "max_marks": m.assessment.max_marks,
            "percentage": round((m.score_obtained / m.assessment.max_marks * 100), 1) if m.assessment.max_marks > 0 else 0,
            "grade": m.grade or "N/A",
            "feedback": m.feedback,
        })

    return {"marks": items}


@router.get("/timetable", summary="Student Section Timetable")
def get_student_timetable(
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    if not student.section_id:
        return {"timetable": []}

    slots = (
        db.query(TimetableSlot)
        .options(
            joinedload(TimetableSlot.subject),
            joinedload(TimetableSlot.staff).joinedload(StaffProfile.user),
        )
        .filter(TimetableSlot.section_id == student.section_id)
        .order_by(TimetableSlot.start_time.asc())
        .all()
    )

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    by_day = {day: [] for day in days}

    for s in slots:
        if s.day_of_week in by_day:
            by_day[s.day_of_week].append({
                "id": s.id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "subject_code": s.subject.code,
                "subject_name": s.subject.name,
                "faculty": s.staff.user.full_name if s.staff and s.staff.user else "Faculty",
                "room": s.room_number,
            })

    return {"days": by_day}


class AssignmentSubmitPayload(BaseModel):
    submission_text: str = Field(..., min_length=1)
    file_path: Optional[str] = None


@router.get("/assignments", summary="Student Assignments & Submission Status")
def get_student_assignments(
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    assignments = (
        db.query(Assignment)
        .options(joinedload(Assignment.subject), joinedload(Assignment.staff).joinedload(StaffProfile.user))
        .filter(Assignment.section_id == student.section_id)
        .order_by(Assignment.due_date.asc())
        .all()
    )

    submissions = {
        sub.assignment_id: sub
        for sub in db.query(AssignmentSubmission).filter(AssignmentSubmission.student_id == student.id).all()
    }

    result = []
    now = datetime.now(timezone.utc)

    for a in assignments:
        sub = submissions.get(a.id)
        result.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "subject": a.subject.name,
            "faculty": a.staff.user.full_name if a.staff and a.staff.user else "Faculty",
            "due_date": a.due_date.isoformat(),
            "max_score": a.max_score,
            "is_past_due": now > a.due_date.replace(tzinfo=timezone.utc if a.due_date.tzinfo is None else None),
            "submission": {
                "id": sub.id,
                "status": sub.status.value,
                "submitted_at": sub.submitted_at.isoformat(),
                "submission_text": sub.submission_text,
                "score": sub.score,
                "feedback": sub.feedback,
            } if sub else None,
        })

    return {"assignments": result}


@router.post("/assignments/{assignment_id}/submit", summary="Submit Assignment Work")
def submit_assignment(
    assignment_id: int,
    payload: AssignmentSubmitPayload,
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    sub = (
        db.query(AssignmentSubmission)
        .filter(AssignmentSubmission.assignment_id == assignment_id, AssignmentSubmission.student_id == student.id)
        .first()
    )

    now = datetime.now(timezone.utc)
    is_late = now > assignment.due_date.replace(tzinfo=timezone.utc if assignment.due_date.tzinfo is None else None)
    status_enum = SubmissionStatus.LATE if is_late else SubmissionStatus.SUBMITTED

    if sub:
        sub.submission_text = payload.submission_text
        sub.file_path = payload.file_path
        sub.submitted_at = now
        sub.status = status_enum
    else:
        sub = AssignmentSubmission(
            assignment_id=assignment_id,
            student_id=student.id,
            submission_text=payload.submission_text,
            file_path=payload.file_path,
            submitted_at=now,
            status=status_enum,
        )
        db.add(sub)

    db.commit()
    return {"success": True, "message": "Assignment submitted successfully."}


@router.get("/materials", summary="Subject Study Materials")
def get_study_materials(
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    # Find all subjects in student's course and semester
    materials = (
        db.query(StudyMaterial)
        .join(Subject)
        .options(joinedload(StudyMaterial.subject), joinedload(StudyMaterial.staff).joinedload(StaffProfile.user))
        .filter(Subject.course_id == student.course_id)
        .order_by(StudyMaterial.created_at.desc())
        .all()
    )

    return {
        "materials": [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "subject": m.subject.name,
                "subject_code": m.subject.code,
                "faculty": m.staff.user.full_name if m.staff and m.staff.user else "Faculty",
                "file_path": m.file_path,
                "uploaded_date": str(m.created_at.date()),
            }
            for m in materials
        ]
    }


@router.get("/fees", summary="Student Fee Records and Payments")
def get_student_fees(
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    fee_records = (
        db.query(StudentFeeRecord)
        .options(joinedload(StudentFeeRecord.fee_structure))
        .filter(StudentFeeRecord.student_id == student.id)
        .all()
    )

    total_due = sum(float(r.amount_due) for r in fee_records)
    total_paid = sum(float(r.amount_paid) for r in fee_records)
    balance = total_due - total_paid

    return {
        "summary": {
            "total_due": total_due,
            "total_paid": total_paid,
            "balance": balance,
            "is_cleared": balance <= 0,
        },
        "records": [
            {
                "id": r.id,
                "title": r.fee_structure.title if r.fee_structure else "Tuition Fee",
                "amount_due": float(r.amount_due),
                "amount_paid": float(r.amount_paid),
                "status": r.payment_status.value,
                "due_date": str(r.fee_structure.due_date) if r.fee_structure else "N/A",
                "last_payment_date": str(r.last_payment_date) if r.last_payment_date else "N/A",
                "transaction_ref": r.transaction_ref,
            }
            for r in fee_records
        ],
    }


@router.get("/library", summary="Student Library Loans & Book Catalog")
def get_student_library(
    query: Optional[str] = None,
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    loans = (
        db.query(BookLoan)
        .options(joinedload(BookLoan.book))
        .filter(BookLoan.student_id == student.id)
        .order_by(BookLoan.borrowed_at.desc())
        .all()
    )

    # Book search catalog
    book_query = db.query(Book)
    if query:
        book_query = book_query.filter((Book.title.ilike(f"%{query}%")) | (Book.author.ilike(f"%{query}%")))
    available_books = book_query.limit(20).all()

    return {
        "borrowed_books": [
            {
                "id": l.id,
                "title": l.book.title,
                "author": l.book.author,
                "borrowed_at": str(l.borrowed_at.date()),
                "due_date": str(l.due_date),
                "status": l.status.value,
                "fine_amount": float(l.fine_amount),
            }
            for l in loans
        ],
        "catalog": [
            {
                "id": b.id,
                "title": b.title,
                "author": b.author,
                "category": b.category,
                "available": b.available_copies > 0,
                "available_copies": b.available_copies,
            }
            for b in available_books
        ],
    }


class LeaveRequestPayload(BaseModel):
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=5)


@router.get("/leave-requests", summary="Student Leave Requests History")
def get_leave_requests(
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    requests = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.student_id == student.id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )
    return {
        "requests": [
            {
                "id": r.id,
                "start_date": str(r.start_date),
                "end_date": str(r.end_date),
                "reason": r.reason,
                "status": r.status.value,
                "review_comments": r.review_comments,
                "applied_on": str(r.created_at.date()),
            }
            for r in requests
        ]
    }


@router.post("/leave-requests", summary="File New Leave Request")
def create_leave_request(
    payload: LeaveRequestPayload,
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot precede start date.")

    req = LeaveRequest(
        student_id=student.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status=LeaveStatus.PENDING,
    )
    db.add(req)
    db.commit()
    return {"success": True, "message": "Leave application submitted for approval."}


@router.get("/examinations", summary="Student Examination Schedule")
def get_student_examinations(
    student: StudentProfile = Depends(get_student_profile),
    db: Session = Depends(get_db),
):
    exams = (
        db.query(Examination)
        .options(joinedload(Examination.schedules).joinedload(ExaminationSchedule.subject))
        .filter(Examination.course_id == student.course_id, Examination.is_published == True)
        .all()
    )

    result = []
    for e in exams:
        schedules = []
        for s in e.schedules:
            schedules.append({
                "id": s.id,
                "subject_code": s.subject.code if s.subject else "N/A",
                "subject_name": s.subject.name if s.subject else "N/A",
                "exam_date": str(s.exam_date),
                "start_time": s.start_time,
                "end_time": s.end_time,
                "venue": s.venue,
            })
        result.append({
            "id": e.id,
            "exam_name": e.exam_name,
            "academic_year": e.academic_year,
            "schedules": schedules,
        })

    return {"examinations": result}


class TicketCreatePayload(BaseModel):
    category: str
    subject: str = Field(..., min_length=3)
    description: str = Field(..., min_length=5)
    priority: TicketPriority = TicketPriority.MEDIUM


@router.get("/support-tickets", summary="Student Support Tickets")
def get_student_support_tickets(
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: Session = Depends(get_db),
):
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return {
        "tickets": [
            {
                "id": t.id,
                "category": t.category,
                "subject": t.subject,
                "description": t.description,
                "priority": t.priority.value,
                "status": t.status.value,
                "created_at": t.created_at.strftime("%b %d, %Y"),
            }
            for t in tickets
        ]
    }


@router.post("/support-tickets", summary="File Student Support Ticket")
def create_student_support_ticket(
    payload: TicketCreatePayload,
    current_user: User = Depends(require_role(UserRole.STUDENT)),
    db: Session = Depends(get_db),
):
    ticket = SupportTicket(
        user_id=current_user.id,
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
        priority=payload.priority,
        status=TicketStatus.OPEN,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {"success": True, "message": "Support ticket filed successfully.", "ticket_id": ticket.id}
