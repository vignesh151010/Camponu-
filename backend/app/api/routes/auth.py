import random
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.db.session import get_db
from app.api.dependencies.auth import check_rate_limit, get_current_user, get_session_token
from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole
from app.models.academic import Department, Course, Semester, Section, Subject, StaffAssignment, StudentProfile, StaffProfile
from app.models.services import Notification
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserResponse,
    PasswordChangeRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    RegisterRequest,
    RegistrationOptionsResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication & Session"])


@router.post("/login", response_model=LoginResponse, summary="User Authentication & Session Creation")
def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    # Enforce rate limiting on login attempts
    check_rate_limit(request, limit=12, window_seconds=300)

    user, error_msg = AuthService.authenticate_user(db, payload.identifier, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error_msg)

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    session = AuthService.create_session(db, user, ip_address=client_ip, user_agent=user_agent)

    # Set secure HTTP-only cookie
    cookie_max_age = (settings.SESSION_EXPIRE_MINUTES * 60) if not payload.remember_me else (30 * 86400)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session.session_token,
        max_age=cookie_max_age,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )

    # Audit log
    AuthService.log_audit(
        db=db,
        actor_id=user.id,
        actor_name=user.full_name,
        action="USER_LOGIN",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Successful login via role '{user.role.value}'",
        ip_address=client_ip,
    )

    return LoginResponse(
        success=True,
        message="Authentication successful",
        token=session.session_token,
        user=user,
    )


@router.post("/logout", summary="Revoke Session & Logout")
def logout(
    response: Response,
    token: str = Depends(get_session_token),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if token:
        AuthService.revoke_session(db, token)

    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)

    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="USER_LOGOUT",
        entity_type="user",
        entity_id=str(current_user.id),
        details="User logged out and session revoked",
    )

    return {"success": True, "message": "Successfully logged out."}


@router.get("/me", response_model=UserResponse, summary="Get Current Authenticated User")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", summary="Update Password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current password you provided is incorrect.",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    AuthService.log_audit(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="PASSWORD_CHANGE",
        entity_type="user",
        entity_id=str(current_user.id),
        details="User password updated successfully",
    )

    return {"success": True, "message": "Password updated successfully."}


@router.post("/forgot-password", response_model=ForgotPasswordResponse, summary="Request Password Reset Token")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    success, msg, token = AuthService.request_password_reset(db, payload.identifier)
    return ForgotPasswordResponse(
        success=success,
        message=msg,
        reset_token=token,
    )


@router.post("/reset-password", response_model=ResetPasswordResponse, summary="Reset Password Using Token")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    success, msg = AuthService.reset_password_with_token(db, payload.token, payload.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )
    return ResetPasswordResponse(
        success=True,
        message=msg,
    )


@router.get("/registration-options", response_model=RegistrationOptionsResponse, summary="Get Academic Options for Registration")
def get_registration_options(db: Session = Depends(get_db)):
    departments = db.query(Department).order_by(Department.code.asc()).all()
    courses = db.query(Course).order_by(Course.code.asc()).all()
    sections = db.query(Section).order_by(Section.name.asc()).all()
    return RegistrationOptionsResponse(
        departments=departments,
        courses=courses,
        sections=sections,
    )


@router.post("/register", response_model=LoginResponse, summary="Create New User Account (Student, Faculty, or Admin)")
def register(
    request: Request,
    response: Response,
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    clean_email = payload.email.strip().lower()

    # 1. Unique email check
    if db.query(User).filter(User.email.ilike(clean_email)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in or use another email.",
        )

    # 2. Register number / Campus ID handling
    reg_number = None
    if payload.register_number and payload.register_number.strip():
        clean_reg = payload.register_number.strip().upper()
        if db.query(User).filter(User.register_number.ilike(clean_reg)).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Register ID '{clean_reg}' is already taken. Please enter a different one or leave blank to auto-generate.",
            )
        reg_number = clean_reg
    else:
        # Auto-generate unique ID based on role
        prefix = "2026STU" if payload.role == UserRole.STUDENT else ("FAC" if payload.role == UserRole.STAFF else "ADM")
        for _ in range(50):
            rand_suffix = f"{random.randint(1000, 9999)}"
            candidate = f"{prefix}-{rand_suffix}" if payload.role != UserRole.STUDENT else f"{prefix}{rand_suffix}"
            if not db.query(User).filter(User.register_number.ilike(candidate)).first():
                reg_number = candidate
                break
        if not reg_number:
            reg_number = f"{prefix}-{random.randint(10000, 99999)}"

    # 3. Create the base User
    user = User(
        email=clean_email,
        register_number=reg_number,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
        phone=payload.phone.strip() if payload.phone else None,
    )
    db.add(user)
    db.flush()

    # 4. Provision role-specific profiles
    if payload.role == UserRole.STUDENT:
        dept = None
        if payload.department_id:
            dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            dept = db.query(Department).first()
        if not dept:
            dept = Department(code="CSE", name="Computer Science & Engineering")
            db.add(dept)
            db.flush()

        course = None
        if payload.course_id:
            course = db.query(Course).filter(Course.id == payload.course_id).first()
        if not course:
            course = db.query(Course).filter(Course.department_id == dept.id).first() or db.query(Course).first()
        if not course:
            course = Course(department_id=dept.id, code="BTECH-CSE", name="B.Tech in Computer Science & Engineering", duration_years=4, total_semesters=8)
            db.add(course)
            db.flush()

        sem = db.query(Semester).filter(Semester.course_id == course.id).first()
        if not sem:
            sem = Semester(course_id=course.id, semester_number=1, academic_year="2026-2027")
            db.add(sem)
            db.flush()

        sec_id = payload.section_id
        if not sec_id:
            sec = db.query(Section).filter(Section.semester_id == sem.id).first()
            if not sec:
                sec = Section(semester_id=sem.id, name="A", capacity=60)
                db.add(sec)
                db.flush()
            sec_id = sec.id

        student_profile = StudentProfile(
            user_id=user.id,
            department_id=dept.id,
            course_id=course.id,
            semester_id=sem.id,
            section_id=sec_id,
            admission_year=payload.admission_year or 2026,
            cgpa=0.0,
        )
        db.add(student_profile)
        db.flush()

        welcome_note = Notification(
            user_id=user.id,
            title="Welcome to CAMPON U!",
            message=f"Welcome {user.full_name}! Your student registration is complete. Your official Student ID is {user.register_number}.",
            link="/student",
        )
        db.add(welcome_note)

    elif payload.role == UserRole.STAFF:
        dept = None
        if payload.department_id:
            dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            dept = db.query(Department).first()
        if not dept:
            dept = Department(code="CSE", name="Computer Science & Engineering")
            db.add(dept)
            db.flush()

        staff_profile = StaffProfile(
            user_id=user.id,
            department_id=dept.id,
            designation=payload.designation or "Assistant Professor",
            specialization=payload.specialization or "Computer Systems",
        )
        db.add(staff_profile)
        db.flush()

        avail_sub = db.query(Subject).join(Course).filter(Course.department_id == dept.id).first() or db.query(Subject).first()
        avail_sec = db.query(Section).first()
        if avail_sub and avail_sec:
            assignment = StaffAssignment(
                staff_id=staff_profile.id,
                subject_id=avail_sub.id,
                section_id=avail_sec.id,
                academic_year="2026-2027",
            )
            db.add(assignment)

        welcome_note = Notification(
            user_id=user.id,
            title="Faculty Onboarding Completed",
            message=f"Welcome to CAMPON U, Prof. {user.full_name}. Your faculty portal and teaching assignments are ready.",
            link="/staff",
        )
        db.add(welcome_note)

    elif payload.role == UserRole.ADMIN:
        welcome_note = Notification(
            user_id=user.id,
            title="Administrator Credentials Activated",
            message=f"Welcome {user.full_name}. You have full operational control over campus systems, faculties, and records.",
            link="/admin",
        )
        db.add(welcome_note)

    db.commit()

    # Query with joined relationships to avoid lazy loading issues
    fresh_user = (
        db.query(User)
        .options(joinedload(User.student_profile), joinedload(User.staff_profile))
        .filter(User.id == user.id)
        .first()
    )

    # 5. Create Server-Side Session and Cookie
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")
    session = AuthService.create_session(db, fresh_user, ip_address=client_ip, user_agent=user_agent)

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session.session_token,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )

    # 6. Audit Log
    AuthService.log_audit(
        db=db,
        actor_id=fresh_user.id,
        actor_name=fresh_user.full_name,
        action="USER_REGISTERED",
        entity_type="user",
        entity_id=str(fresh_user.id),
        details=f"Self-registered as '{fresh_user.role.value}' with ID '{fresh_user.register_number}'",
        ip_address=client_ip,
    )

    return LoginResponse(
        success=True,
        message=f"Account created successfully as {fresh_user.role.value.capitalize()}! Welcome, {fresh_user.full_name}.",
        token=session.session_token,
        user=fresh_user,
    )

