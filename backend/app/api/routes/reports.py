import csv
import io
from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies.auth import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.academic import StudentProfile, Department, Course, Section, Subject
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.marks import Mark, Assessment
from app.models.services import StudentFeeRecord

router = APIRouter(prefix="/reports", tags=["Reports & Data Exports"])


@router.get("/students.csv", summary="Export Student Enrolment CSV")
def export_students_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.STAFF)),
):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Register Number", "Full Name", "Email", "Department", "Course", "Section", "Admission Year", "CGPA"])

    students = (
        db.query(StudentProfile)
        .options(
            joinedload(StudentProfile.user),
            joinedload(StudentProfile.department),
            joinedload(StudentProfile.course),
            joinedload(StudentProfile.section),
        )
        .all()
    )

    for s in students:
        writer.writerow([
            s.user.register_number or "",
            s.user.full_name,
            s.user.email,
            s.department.name if s.department else "",
            s.course.name if s.course else "",
            s.section.name if s.section else "",
            s.admission_year,
            s.cgpa,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students_enrolment_report.csv"},
    )


@router.get("/attendance.csv", summary="Export Attendance Summary CSV")
def export_attendance_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.STAFF)),
):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Register Number", "Full Name", "Department", "Total Classes", "Attended", "Attendance Percentage", "Status"])

    students = (
        db.query(StudentProfile)
        .options(joinedload(StudentProfile.user), joinedload(StudentProfile.department))
        .all()
    )

    for s in students:
        total = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).count()
        attended = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.student_id == s.id, AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]))
            .count()
        )
        pct = round((attended / total * 100), 1) if total > 0 else 100.0
        status_label = "Warning (<75%)" if pct < 75.0 else "Satisfactory"

        writer.writerow([
            s.user.register_number or "",
            s.user.full_name,
            s.department.name if s.department else "",
            total,
            attended,
            f"{pct}%",
            status_label,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=college_attendance_report.csv"},
    )
