import pytest


def get_token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    return res.json()["token"]


def test_student_cannot_access_admin_stats(client):
    token = get_token(client, "student@camponu.edu", "Student@123")
    res = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_student_cannot_mark_attendance(client):
    token = get_token(client, "student@camponu.edu", "Student@123")
    res = client.post(
        "/api/v1/staff/attendance/submit",
        json={
            "subject_id": 1,
            "section_id": 1,
            "session_date": "2026-10-21",
            "start_time": "14:00",
            "end_time": "15:00",
            "records": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_staff_cannot_create_departments(client):
    token = get_token(client, "alan.turing@camponu.edu", "Staff@123")
    res = client.post(
        "/api/v1/admin/departments",
        json={"code": "PHY", "name": "Department of Physics"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_admin_can_access_admin_stats(client):
    token = get_token(client, "admin@camponu.edu", "Admin@123")
    res = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_students" in data
    assert data["total_students"] >= 2
