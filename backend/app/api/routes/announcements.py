from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.services import Announcement, AudienceType
from app.services.auth_service import AuthService

router = APIRouter(prefix="/announcements", tags=["Announcements"])


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3)
    content: str = Field(..., min_length=5)
    target_audience: AudienceType = AudienceType.ALL
    department_id: Optional[int] = None
    section_id: Optional[int] = None


@router.get("", summary="Get Announcements for Current User")
def get_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Announcement)

    if current_user.role == UserRole.STUDENT and current_user.student_profile:
        sp = current_user.student_profile
        q = q.filter(
            (Announcement.target_audience == AudienceType.ALL)
            | ((Announcement.target_audience == AudienceType.DEPARTMENT) & (Announcement.department_id == sp.department_id))
            | ((Announcement.target_audience == AudienceType.SECTION) & (Announcement.section_id == sp.section_id))
        )
    elif current_user.role == UserRole.STAFF and current_user.staff_profile:
        st = current_user.staff_profile
        q = q.filter(
            (Announcement.target_audience.in_([AudienceType.ALL, AudienceType.STAFF_ONLY]))
            | ((Announcement.target_audience == AudienceType.DEPARTMENT) & (Announcement.department_id == st.department_id))
        )

    announcements = q.order_by(Announcement.created_at.desc()).limit(30).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "target": a.target_audience.value,
            "created_at": a.created_at.isoformat(),
        }
        for a in announcements
    ]


@router.post("", summary="Publish Announcement")
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STAFF, UserRole.ADMIN)),
):
    announcement = Announcement(
        title=payload.title,
        content=payload.content,
        target_audience=payload.target_audience,
        department_id=payload.department_id,
        section_id=payload.section_id,
        created_by=current_user.id,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="ANNOUNCEMENT_PUBLISHED",
        entity_type="announcement",
        entity_id=str(announcement.id),
        details=f"Broadcasted '{announcement.title}' to audience '{announcement.target_audience.value}'",
    )

    return {"success": True, "message": "Announcement broadcasted.", "id": announcement.id}
