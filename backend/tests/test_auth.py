from datetime import datetime, timedelta, timezone
import pytest
from app.db.session import SessionLocal
from app.models.user import User, UserSession
from app.api.dependencies.auth import check_rate_limit, reset_rate_limits
from starlette.requests import Request


def test_valid_student_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "student@camponu.edu", "password": "Student@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["role"] == "student"
    assert data["user"]["email"] == "student@camponu.edu"
    assert "password_hash" not in data["user"]


def test_valid_staff_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "alan.turing@camponu.edu", "password": "Staff@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["role"] == "staff"
    assert "password_hash" not in data["user"]


def test_valid_admin_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@camponu.edu", "password": "Admin@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["role"] == "admin"
    assert "password_hash" not in data["user"]


def test_login_with_register_number(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "2026CSE001", "password": "Student@123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["full_name"] == "Karthikeyan S."


def test_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "student@camponu.edu", "password": "WrongPassword999"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "Invalid credentials" in data["error"]["message"]


def test_unknown_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "nonexistent.person@camponu.edu", "password": "Password@123"},
    )
    assert response.status_code == 401


def test_current_user_me_endpoint(client):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "student@camponu.edu", "password": "Student@123"},
    )
    token = login_res.json()["token"]

    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "student@camponu.edu"
    assert me_data["student_profile"] is not None
    assert "password_hash" not in me_data


def test_logout_revokes_session(client):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "student@camponu.edu", "password": "Student@123"},
    )
    token = login_res.json()["token"]

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Subsequent /me with revoked token must fail with 401
    subsequent_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert subsequent_res.status_code == 401


def test_deactivated_account_login_rejected(client):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "student@camponu.edu").first()
        user.is_active = False
        db.commit()

        # Login must fail
        login_res = client.post(
            "/api/v1/auth/login",
            json={"identifier": "student@camponu.edu", "password": "Student@123"},
        )
        assert login_res.status_code == 401
        assert "deactivated" in login_res.json()["error"]["message"].lower()
    finally:
        # Restore active state
        user.is_active = True
        db.commit()
        db.close()


def test_expired_session_rejected(client):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "student@camponu.edu").first()
        expired_time = datetime.now(timezone.utc) - timedelta(hours=2)
        expired_session = UserSession(
            user_id=user.id,
            session_token="test_expired_session_token_12345",
            expires_at=expired_time,
        )
        db.add(expired_session)
        db.commit()

        res = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer test_expired_session_token_12345"},
        )
        assert res.status_code == 401
    finally:
        db.query(UserSession).filter(UserSession.session_token == "test_expired_session_token_12345").delete()
        db.commit()
        db.close()


def test_password_reset_workflow(client):
    # 1. Request reset token
    forgot_res = client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": "student@camponu.edu"},
    )
    assert forgot_res.status_code == 200
    forgot_data = forgot_res.json()
    assert forgot_data["success"] is True
    token = forgot_data["reset_token"]
    assert token is not None

    # 2. Reset password using valid token
    new_pass = "UpdatedPass@2026"
    reset_res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": new_pass},
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    # 3. Old password should fail
    old_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "student@camponu.edu", "password": "Student@123"},
    )
    assert old_login.status_code == 401

    # 4. New password succeeds
    new_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "student@camponu.edu", "password": new_pass},
    )
    assert new_login.status_code == 200

    # 5. Token cannot be reused (one-time use)
    reuse_res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "YetAnotherPass@123"},
    )
    assert reuse_res.status_code == 400

    # 6. Restore original password for ongoing test suite consistency
    restore_req = client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": "student@camponu.edu"},
    )
    restore_token = restore_req.json()["reset_token"]
    client.post(
        "/api/v1/auth/reset-password",
        json={"token": restore_token, "new_password": "Student@123"},
    )


def test_rate_limiting_enforced():
    reset_rate_limits()
    # Mock request scope with client IP
    scope = {
        "type": "http",
        "client": ("192.168.1.100", 12345),
        "headers": [],
    }
    mock_request = Request(scope)

    # Calling under limit must succeed
    check_rate_limit(mock_request, limit=3, window_seconds=60, enforce_in_tests=True)
    check_rate_limit(mock_request, limit=3, window_seconds=60, enforce_in_tests=True)
    check_rate_limit(mock_request, limit=3, window_seconds=60, enforce_in_tests=True)

    # 4th call must trigger 429
    with pytest.raises(Exception) as exc_info:
        check_rate_limit(mock_request, limit=3, window_seconds=60, enforce_in_tests=True)
    assert "429" in str(exc_info.value)
    reset_rate_limits()


def test_registration_options(client):
    res = client.get("/api/v1/auth/registration-options")
    assert res.status_code == 200
    data = res.json()
    assert "departments" in data
    assert "courses" in data
    assert "sections" in data
    assert len(data["departments"]) > 0


def test_register_new_student_and_auto_login(client):
    import uuid
    from app.db.session import SessionLocal
    from app.models.user import User

    unique_id = uuid.uuid4().hex[:6]
    test_email = f"student_{unique_id}@camponu.edu"
    payload = {
        "full_name": f"Aarav Patel {unique_id}",
        "email": test_email,
        "password": "SecurePassword@123",
        "role": "student",
        "admission_year": 2026,
    }
    try:
        res = client.post("/api/v1/auth/register", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["token"] is not None
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "student"
        assert data["user"]["register_number"] is not None
        assert data["user"]["student_profile"] is not None

        # Verify session is valid via /me
        me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == test_email
    finally:
        db = SessionLocal()
        try:
            created_user = db.query(User).filter(User.email == test_email).first()
            if created_user:
                db.delete(created_user)
                db.commit()
        finally:
            db.close()


def test_register_duplicate_email_rejected(client):
    payload = {
        "full_name": "Duplicate Student",
        "email": "student@camponu.edu",  # Seeded student
        "password": "Password@123",
        "role": "student",
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 400
    assert "already exists" in res.text


def test_register_new_faculty(client):
    import uuid
    from app.db.session import SessionLocal
    from app.models.user import User

    unique_id = uuid.uuid4().hex[:6]
    test_email = f"faculty_{unique_id}@camponu.edu"
    payload = {
        "full_name": f"Dr. Katherine Johnson {unique_id}",
        "email": test_email,
        "password": "FacultyPassword@123",
        "role": "staff",
        "designation": "Associate Professor",
        "specialization": "Quantum Computing",
    }
    try:
        res = client.post("/api/v1/auth/register", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "staff"
        assert data["user"]["staff_profile"]["designation"] == "Associate Professor"
    finally:
        db = SessionLocal()
        try:
            created_user = db.query(User).filter(User.email == test_email).first()
            if created_user:
                db.delete(created_user)
                db.commit()
        finally:
            db.close()


