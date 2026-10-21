from datetime import date, datetime, timezone
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies.auth import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.academic import Department, Course, Section, Subject, StaffProfile, StaffAssignment, StudentProfile
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.models.marks import Assessment, AssessmentType, Mark
from app.models.timetable import TimetableSlot
from app.models.assignment import Assignment, AssignmentSubmission, StudyMaterial, SubmissionStatus
from app.services.auth_service import AuthService

router = APIRouter(prefix="/staff", tags=["Staff Portal"])


def get_staff_profile(current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)), db: Session = Depends(get_db)) -> StaffProfile:
    profile = db.query(StaffProfile).filter(StaffProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Staff academic profile not found.")
    return profile


@router.get("/overview", summary="Staff Dashboard Overview")
def get_staff_overview(
    current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)),
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    # Assigned classes and subjects
    assignments = (
        db.query(StaffAssignment)
        .options(
            joinedload(StaffAssignment.subject),
            joinedload(StaffAssignment.section),
        )
        .filter(StaffAssignment.staff_id == staff.id)
        .all()
    )

    # Today's timetable
    today_day = datetime.now().strftime("%A")
    today_classes = (
        db.query(TimetableSlot)
        .options(joinedload(TimetableSlot.subject), joinedload(TimetableSlot.section))
        .filter(TimetableSlot.staff_id == staff.id, TimetableSlot.day_of_week == today_day)
        .order_by(TimetableSlot.start_time.asc())
        .all()
    )

    # Pending assignment grading
    subject_ids = [a.subject_id for a in assignments]
    pending_submissions = (
        db.query(AssignmentSubmission)
        .join(Assignment)
        .filter(Assignment.subject_id.in_(subject_ids), AssignmentSubmission.status == SubmissionStatus.SUBMITTED)
        .count() if subject_ids else 0
    )

    dept = db.query(Department).filter(Department.id == staff.department_id).first()

    return {
        "profile": {
            "full_name": current_user.full_name,
            "email": current_user.email,
            "department": dept.name if dept else "N/A",
            "designation": staff.designation,
            "specialization": staff.specialization,
        },
        "stats": {
            "assigned_subjects_count": len(assignments),
            "today_classes_count": len(today_classes),
            "pending_grading_count": pending_submissions,
        },
        "today_schedule": [
            {
                "id": c.id,
                "start_time": c.start_time,
                "end_time": c.end_time,
                "subject_code": c.subject.code,
                "subject_name": c.subject.name,
                "section": c.section.name,
                "room": c.room_number,
            }
            for c in today_classes
        ],
        "assigned_classes": [
            {
                "id": a.id,
                "subject_id": a.subject.id,
                "subject_code": a.subject.code,
                "subject_name": a.subject.name,
                "section_id": a.section.id,
                "section_name": a.section.name,
            }
            for a in assignments
        ],
    }


@router.get("/assignments-list", summary="Get Staff Teaching Assignments")
def get_teaching_assignments(
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    assignments = (
        db.query(StaffAssignment)
        .options(joinedload(StaffAssignment.subject), joinedload(StaffAssignment.section))
        .filter(StaffAssignment.staff_id == staff.id)
        .all()
    )
    return {
        "assignments": [
            {
                "assignment_id": a.id,
                "subject_id": a.subject_id,
                "subject_code": a.subject.code,
                "subject_name": a.subject.name,
                "section_id": a.section_id,
                "section_name": a.section.name,
            }
            for a in assignments
        ]
    }


@router.get("/attendance/roster", summary="Get Student Roster for Attendance Marking")
def get_attendance_roster(
    section_id: int,
    subject_id: int,
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    # Verify staff is assigned to this section and subject
    assignment = (
        db.query(StaffAssignment)
        .filter(
            StaffAssignment.staff_id == staff.id,
            StaffAssignment.section_id == section_id,
            StaffAssignment.subject_id == subject_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not authorized to mark attendance for this class.")

    students = (
        db.query(StudentProfile)
        .options(joinedload(StudentProfile.user))
        .filter(StudentProfile.section_id == section_id)
        .all()
    )

    return {
        "roster": [
            {
                "student_id": s.id,
                "register_number": s.user.register_number,
                "full_name": s.user.full_name,
                "default_status": "present",
            }
            for s in students
        ]
    }


class AttendanceRecordInput(BaseModel):
    student_id: int
    status: AttendanceStatus = AttendanceStatus.PRESENT
    remarks: Optional[str] = None


class AttendanceSessionSubmit(BaseModel):
    subject_id: int
    section_id: int
    session_date: date
    start_time: str = Field(..., json_schema_extra={"example": "09:00"})
    end_time: str = Field(..., json_schema_extra={"example": "10:00"})
    topic: Optional[str] = None
    records: List[AttendanceRecordInput]


@router.post("/attendance/submit", summary="Record and Submit Attendance Session")
def submit_attendance_session(
    payload: AttendanceSessionSubmit,
    current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)),
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    # Check for existing session on same slot to prevent duplication
    existing = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.subject_id == payload.subject_id,
            AttendanceSession.section_id == payload.section_id,
            AttendanceSession.session_date == payload.session_date,
            AttendanceSession.start_time == payload.start_time,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="An attendance session for this class and time slot already exists. Duplicate sessions are not allowed.",
        )

    session = AttendanceSession(
        staff_id=staff.id,
        subject_id=payload.subject_id,
        section_id=payload.section_id,
        session_date=payload.session_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        topic=payload.topic,
    )
    db.add(session)
    db.flush()

    for r in payload.records:
        rec = AttendanceRecord(
            session_id=session.id,
            student_id=r.student_id,
            status=r.status,
            remarks=r.remarks,
        )
        db.add(rec)

    db.commit()

    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="ATTENDANCE_RECORDED",
        entity_type="attendance_session",
        entity_id=str(session.id),
        details=f"Marked attendance for {len(payload.records)} students on {payload.session_date}",
    )

    return {"success": True, "message": "Attendance successfully recorded.", "session_id": session.id}


class AssessmentCreate(BaseModel):
    subject_id: int
    section_id: int
    title: str = Field(..., min_length=2)
    assessment_type: AssessmentType = AssessmentType.INTERNAL_1
    max_marks: float = Field(default=100.0, gt=0)
    weightage_percent: float = Field(default=20.0, gt=0)


@router.get("/assessments", summary="List Assessments Created by Staff")
def get_assessments(
    subject_id: Optional[int] = None,
    section_id: Optional[int] = None,
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Assessment)
        .options(joinedload(Assessment.subject), joinedload(Assessment.section))
        .filter(Assessment.staff_id == staff.id)
    )
    if subject_id:
        query = query.filter(Assessment.subject_id == subject_id)
    if section_id:
        query = query.filter(Assessment.section_id == section_id)

    assessments = query.order_by(Assessment.created_at.desc()).all()
    return {
        "assessments": [
            {
                "id": a.id,
                "title": a.title,
                "subject": a.subject.name,
                "section": a.section.name,
                "assessment_type": a.assessment_type.value,
                "max_marks": a.max_marks,
                "is_published": a.is_published,
                "created_at": str(a.created_at.date()),
            }
            for a in assessments
        ]
    }


@router.post("/assessments", summary="Create New Assessment")
def create_assessment(
    payload: AssessmentCreate,
    current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)),
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    assessment = Assessment(
        staff_id=staff.id,
        subject_id=payload.subject_id,
        section_id=payload.section_id,
        title=payload.title,
        assessment_type=payload.assessment_type,
        max_marks=payload.max_marks,
        weightage_percent=payload.weightage_percent,
        is_published=False,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="ASSESSMENT_CREATED",
        entity_type="assessment",
        entity_id=str(assessment.id),
        details=f"Created assessment '{assessment.title}' (Max: {assessment.max_marks})",
    )

    return {"success": True, "message": "Assessment created.", "assessment_id": assessment.id}


class StudentMarkInput(BaseModel):
    student_id: int
    score_obtained: float = Field(..., ge=0)
    grade: Optional[str] = None
    feedback: Optional[str] = None


class BatchMarksEntry(BaseModel):
    marks: List[StudentMarkInput]


@router.get("/assessments/{assessment_id}/marks", summary="Get Marks Roster for Assessment")
def get_assessment_marks_roster(
    assessment_id: int,
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.staff_id == staff.id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found or unauthorized.")

    students = (
        db.query(StudentProfile)
        .options(joinedload(StudentProfile.user))
        .filter(StudentProfile.section_id == assessment.section_id)
        .all()
    )

    existing_marks = {
        m.student_id: m for m in db.query(Mark).filter(Mark.assessment_id == assessment_id).all()
    }

    return {
        "assessment": {
            "id": assessment.id,
            "title": assessment.title,
            "max_marks": assessment.max_marks,
            "is_published": assessment.is_published,
        },
        "roster": [
            {
                "student_id": s.id,
                "register_number": s.user.register_number,
                "full_name": s.user.full_name,
                "score_obtained": existing_marks[s.id].score_obtained if s.id in existing_marks else 0.0,
                "grade": existing_marks[s.id].grade if s.id in existing_marks else "",
                "feedback": existing_marks[s.id].feedback if s.id in existing_marks else "",
            }
            for s in students
        ],
    }


@router.post("/assessments/{assessment_id}/marks", summary="Enter/Update Student Marks")
def enter_assessment_marks(
    assessment_id: int,
    payload: BatchMarksEntry,
    current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)),
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.staff_id == staff.id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found or unauthorized.")

    for m in payload.marks:
        if m.score_obtained > assessment.max_marks:
            raise HTTPException(
                status_code=400,
                detail=f"Score {m.score_obtained} exceeds maximum allowed marks of {assessment.max_marks}.",
            )

        existing = (
            db.query(Mark)
            .filter(Mark.assessment_id == assessment_id, Mark.student_id == m.student_id)
            .first()
        )
        if existing:
            existing.score_obtained = m.score_obtained
            existing.grade = m.grade
            existing.feedback = m.feedback
        else:
            new_mark = Mark(
                assessment_id=assessment_id,
                student_id=m.student_id,
                score_obtained=m.score_obtained,
                grade=m.grade,
                feedback=m.feedback,
            )
            db.add(new_mark)

    db.commit()

    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="MARKS_UPDATED",
        entity_type="assessment",
        entity_id=str(assessment.id),
        details=f"Updated marks for {len(payload.marks)} students",
    )

    return {"success": True, "message": "Marks successfully saved."}


@router.post("/assessments/{assessment_id}/toggle-publish", summary="Toggle Publication of Results")
def toggle_publish_assessment(
    assessment_id: int,
    current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)),
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.staff_id == staff.id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")

    assessment.is_published = not assessment.is_published
    db.commit()

    action = "PUBLISHED" if assessment.is_published else "UNPUBLISHED"
    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action=f"ASSESSMENT_{action}",
        entity_type="assessment",
        entity_id=str(assessment.id),
        details=f"Assessment marks {action.lower()} for '{assessment.title}'",
    )

    return {"success": True, "is_published": assessment.is_published}


class AssignmentCreateInput(BaseModel):
    subject_id: int
    section_id: int
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    due_date: datetime
    max_score: float = Field(default=100.0, gt=0)


@router.get("/assignments", summary="List Assignments Created by Staff")
def get_staff_assignments(
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    assignments = (
        db.query(Assignment)
        .options(joinedload(Assignment.subject), joinedload(Assignment.section))
        .filter(Assignment.staff_id == staff.id)
        .order_by(Assignment.created_at.desc())
        .all()
    )

    return {
        "assignments": [
            {
                "id": a.id,
                "title": a.title,
                "subject": a.subject.name,
                "section": a.section.name,
                "due_date": a.due_date.isoformat(),
                "max_score": a.max_score,
                "submissions_count": db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id == a.id).count(),
            }
            for a in assignments
        ]
    }


@router.post("/assignments", summary="Create New Assignment")
def create_staff_assignment(
    payload: AssignmentCreateInput,
    current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)),
    staff: StaffProfile = Depends(get_staff_profile),
    db: Session = Depends(get_db),
):
    assignment = Assignment(
        staff_id=staff.id,
        subject_id=payload.subject_id,
        section_id=payload.section_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        max_score=payload.max_score,
    )
    db.add(assignment)
    db.commit()

    return {"success": True, "message": "Assignment created successfully.", "id": assignment.id}


class GradeSubmissionPayload(BaseModel):
    score: float = Field(..., ge=0)
    feedback: Optional[str] = None


@router.post("/submissions/{submission_id}/grade", summary="Grade a Student Submission")
def grade_submission(
    submission_id: int,
    payload: GradeSubmissionPayload,
    current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    sub = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    sub.score = payload.score
    sub.feedback = payload.feedback
    sub.status = SubmissionStatus.GRADED
    sub.graded_at = datetime.now(timezone.utc)
    db.commit()

    return {"success": True, "message": "Submission graded successfully."}
