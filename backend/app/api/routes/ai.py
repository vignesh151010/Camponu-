from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.academic import StudentProfile, StaffProfile, Subject
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.marks import Mark, Assessment
from app.models.timetable import TimetableSlot
from app.models.assignment import Assignment, AssignmentSubmission
from app.models.services import ChatSession, ChatMessage, StudentFeeRecord, BookLoan, LoanStatus
from app.ai.provider import get_ai_provider

router = APIRouter(prefix="/ai", tags=["AI College & Study Assistant"])


class ChatQueryPayload(BaseModel):
    message: str = Field(..., min_length=2, max_length=1000)
    session_id: Optional[int] = None
    mode: str = Field(default="college", pattern="^(college|study)$")


def build_verified_context(user: User, db: Session, query: str) -> str:
    """
    Retrieves authorized college data specifically for the authenticated user.
    Never executes arbitrary SQL from user prompts.
    """
    if user.role != UserRole.STUDENT or not user.student_profile:
        return f"User: {user.full_name}, Role: {user.role.value}. Staff/Admin profile."

    sp = user.student_profile
    lines = [f"Student: {user.full_name} (Register No: {user.register_number})"]

    q_lower = query.lower()

    if any(k in q_lower for k in ["attendance", "percent", "present", "absent"]):
        total = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == sp.id).count()
        present = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.student_id == sp.id, AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]))
            .count()
        )
        pct = round((present / total * 100), 1) if total > 0 else 100.0
        lines.append(f"Attendance Rate: {pct}% ({present}/{total} lectures attended). Warning status: {'ATTENDANCE SHORTAGE (<75%)' if pct < 75.0 else 'In good standing'}.")

    if any(k in q_lower for k in ["mark", "score", "grade", "result", "exam"]):
        marks = (
            db.query(Mark)
            .join(Assessment)
            .options(joinedload(Mark.assessment).joinedload(Assessment.subject))
            .filter(Mark.student_id == sp.id, Assessment.is_published == True)
            .limit(6)
            .all()
        )
        if marks:
            mark_strings = [f"{m.assessment.subject.name} - {m.assessment.title}: {m.score_obtained}/{m.assessment.max_marks} (Grade: {m.grade or 'N/A'})" for m in marks]
            lines.append("Published Marks: " + "; ".join(mark_strings))
        else:
            lines.append("Marks: No published examination results available currently.")

    if any(k in q_lower for k in ["assignment", "homework", "due"]):
        submitted_ids = [
            sub.assignment_id for sub in db.query(AssignmentSubmission.assignment_id).filter(AssignmentSubmission.student_id == sp.id).all()
        ]
        pending = (
            db.query(Assignment)
            .filter(
                Assignment.section_id == sp.section_id,
                Assignment.due_date >= datetime.now(timezone.utc),
                ~Assignment.id.in_(submitted_ids) if submitted_ids else True,
            )
            .all()
        )
        if pending:
            p_strings = [f"'{p.title}' due {p.due_date.strftime('%b %d, %Y')}" for p in pending]
            lines.append("Pending Assignments: " + ", ".join(p_strings))
        else:
            lines.append("Assignments: All current assignments have been submitted.")

    if any(k in q_lower for k in ["class", "timetable", "schedule", "today"]):
        today = datetime.now().strftime("%A")
        slots = (
            db.query(TimetableSlot)
            .options(joinedload(TimetableSlot.subject))
            .filter(TimetableSlot.section_id == sp.section_id, TimetableSlot.day_of_week == today)
            .order_by(TimetableSlot.start_time.asc())
            .all()
        )
        if slots:
            s_strings = [f"{s.start_time}-{s.end_time}: {s.subject.name} (Room {s.room_number})" for s in slots]
            lines.append(f"Today's Classes ({today}): " + "; ".join(s_strings))
        else:
            lines.append(f"Today's Classes ({today}): No classes scheduled.")

    if any(k in q_lower for k in ["fee", "dues", "balance"]):
        records = db.query(StudentFeeRecord).filter(StudentFeeRecord.student_id == sp.id).all()
        due = sum(float(r.amount_due) for r in records)
        paid = sum(float(r.amount_paid) for r in records)
        lines.append(f"Fee Balance: Total Due: ${due:,.2f}, Total Paid: ${paid:,.2f}, Outstanding: ${(due - paid):,.2f}")

    if any(k in q_lower for k in ["book", "library"]):
        loans = db.query(BookLoan).options(joinedload(BookLoan.book)).filter(BookLoan.student_id == sp.id, BookLoan.status == LoanStatus.ACTIVE).all()
        if loans:
            b_strings = [f"'{l.book.title}' (Due: {l.due_date})" for l in loans]
            lines.append("Borrowed Books: " + ", ".join(b_strings))
        else:
            lines.append("Library: No books currently checked out.")

    return "\n".join(lines)


@router.post("/chat", summary="Chat with AI College or Study Assistant")
async def chat_with_assistant(
    payload: ChatQueryPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find or create chat session
    chat_session = None
    if payload.session_id:
        chat_session = db.query(ChatSession).filter(ChatSession.id == payload.session_id, ChatSession.user_id == current_user.id).first()

    if not chat_session:
        title_snippet = payload.message[:60] + ("..." if len(payload.message) > 60 else "")
        chat_session = ChatSession(user_id=current_user.id, title=title_snippet)
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)

    # Save user message
    user_msg = ChatMessage(session_id=chat_session.id, sender="user", content=payload.message)
    db.add(user_msg)
    db.commit()

    # Build prompt
    if payload.mode == "college":
        verified_context = build_verified_context(current_user, db, payload.message)
        system_prompt = (
            "You are CAMPON U College Assistant. You assist students by answering questions about "
            "their attendance, marks, assignments, classes, and fees strictly using the verified records below.\n"
            "Rules:\n"
            "1. Only state facts present in the verified records.\n"
            "2. Never reveal confidential administrative data or other students' information.\n"
            "3. If information is not in the records, politely state that it has not been published yet.\n"
            "Verified College Records:\n"
            f"{verified_context}"
        )
    else:
        system_prompt = (
            "You are CAMPON U Study Assistant. You explain computer science, programming, algorithms, "
            "databases, web development, and engineering concepts clearly with concise examples and best practices."
        )

    provider = get_ai_provider()
    response_text = await provider.generate_response(system_prompt=system_prompt, user_prompt=payload.message)

    # Save assistant message
    ai_msg = ChatMessage(session_id=chat_session.id, sender="assistant", content=response_text)
    db.add(ai_msg)
    db.commit()

    return {
        "session_id": chat_session.id,
        "reply": response_text,
        "mode": payload.mode,
    }


@router.get("/history", summary="Get Current User AI Chat Sessions")
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(ChatSession)
        .options(joinedload(ChatSession.messages))
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .limit(10)
        .all()
    )

    return [
        {
            "id": s.id,
            "title": s.title,
            "updated_at": s.updated_at.isoformat(),
            "messages": [
                {"id": m.id, "sender": m.sender, "content": m.content, "timestamp": m.created_at.isoformat()}
                for m in s.messages
            ],
        }
        for s in sessions
    ]
