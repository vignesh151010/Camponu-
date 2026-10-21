import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from app.core.config import settings
from app.core.security import verify_password, generate_session_token, hash_password
from app.models.user import User, UserSession, AuditLog, PasswordResetToken


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, identifier: str, password: str) -> Tuple[Optional[User], str]:
        """
        Authenticates a user by email or register number.
        Returns (User, "") on success or (None, error_message) on failure.
        """
        clean_id = identifier.strip().lower()
        user = (
            db.query(User)
            .filter((User.email.ilike(clean_id)) | (User.register_number.ilike(clean_id)))
            .first()
        )

        if not user:
            return None, "Invalid credentials. Please verify your email or register number."

        if not user.is_active:
            return None, "This account has been deactivated. Please contact the administrator."

        if not verify_password(password, user.password_hash):
            return None, "Invalid credentials. Please verify your password."

        return user, ""

    @staticmethod
    def create_session(db: Session, user: User, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> UserSession:
        """
        Creates a new server-side session token with expiration.
        """
        token = generate_session_token()
        expires = datetime.now(timezone.utc) + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)

        session = UserSession(
            user_id=user.id,
            session_token=token,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def validate_session(db: Session, session_token: str) -> Optional[User]:
        """
        Validates an active session token and returns the authenticated User.
        """
        if not session_token:
            return None

        now = datetime.now(timezone.utc)
        session = (
            db.query(UserSession)
            .options(
                joinedload(UserSession.user).joinedload(User.student_profile),
                joinedload(UserSession.user).joinedload(User.staff_profile),
            )
            .filter(UserSession.session_token == session_token, UserSession.expires_at > now)
            .first()
        )

        if not session or not session.user or not session.user.is_active:
            return None

        return session.user

    @staticmethod
    def revoke_session(db: Session, session_token: str) -> bool:
        """
        Revokes an active session by deleting it from the session table.
        """
        deleted = db.query(UserSession).filter(UserSession.session_token == session_token).delete()
        db.commit()
        return deleted > 0

    @staticmethod
    def request_password_reset(db: Session, identifier: str) -> Tuple[bool, str, Optional[str]]:
        """
        Initiates a password reset workflow.
        Returns (success, message, token_or_none).
        """
        clean_id = identifier.strip().lower()
        user = (
            db.query(User)
            .filter((User.email.ilike(clean_id)) | (User.register_number.ilike(clean_id)))
            .first()
        )

        if not user or not user.is_active:
            return True, "If an active account exists for this identifier, a password reset token has been generated.", None

        # Invalidate previous unused reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False,
        ).update({"is_used": True})

        # Generate secure random token
        reset_token_str = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token=reset_token_str,
            expires_at=expires,
            is_used=False,
        )
        db.add(reset_record)
        db.commit()

        AuthService.log_audit(
            db=db,
            actor_id=user.id,
            actor_name=user.full_name,
            action="PASSWORD_RESET_REQUESTED",
            entity_type="user",
            entity_id=str(user.id),
            details="Password reset token issued (valid for 1 hour)",
        )

        return True, "Password reset token generated successfully. Valid for 1 hour.", reset_token_str

    @staticmethod
    def reset_password_with_token(db: Session, token: str, new_password: str) -> Tuple[bool, str]:
        """
        Verifies one-time password reset token, updates password, and revokes existing sessions.
        """
        clean_token = token.strip()
        now = datetime.now(timezone.utc)

        record = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.token == clean_token,
                PasswordResetToken.is_used == False,
                PasswordResetToken.expires_at > now,
            )
            .first()
        )

        if not record or not record.user:
            return False, "Invalid, expired, or already used password reset token. Please request a new one."

        user = record.user
        if not user.is_active:
            return False, "This account is inactive. Please contact administrator."

        # Update password
        user.password_hash = hash_password(new_password)
        record.is_used = True

        # Revoke all existing sessions for security
        db.query(UserSession).filter(UserSession.user_id == user.id).delete()

        AuthService.log_audit(
            db=db,
            actor_id=user.id,
            actor_name=user.full_name,
            action="PASSWORD_RESET_COMPLETED",
            entity_type="user",
            entity_id=str(user.id),
            details="User password reset successfully using token; existing sessions revoked.",
        )

        db.commit()
        return True, "Password has been reset successfully. Please log in with your new password."

    @staticmethod
    def log_audit(
        db: Session,
        actor_id: Optional[int],
        actor_name: Optional[str],
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """
        Records an immutable audit log entry.
        """
        log = AuditLog(
            actor_id=actor_id,
            actor_name=actor_name,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
        )
        db.add(log)
        db.commit()
        return log
