import pytest
from datetime import date, datetime, timedelta, timezone
from app.db.session import SessionLocal
from app.models.attendance import AttendanceSession
from app.models.marks import Assessment


def get_token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    return res.json()["token"]


def test_student_overview_data(client):
    token = get_token(client, "student@camponu.edu", "Student@123")
    res = client.get("/api/v1/student/overview", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "student" in data
    assert "stats" in data
    assert data["stats"]["attendance_percentage"] > 75.0
    assert len(data["recent_marks"]) > 0


def test_student_attendance_records(client):
    token = get_token(client, "student@camponu.edu", "Student@123")
    res = client.get("/api/v1/student/attendance", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "overall_percentage" in data
    assert len(data["subjects"]) > 0
    assert len(data["history"]) > 0


def test_student_marks_published_only(client):
    token = get_token(client, "student@camponu.edu", "Student@123")
    res = client.get("/api/v1/student/marks", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["marks"]) > 0
    for m in data["marks"]:
        assert "score_obtained" in m
        assert "max_marks" in m


def test_timetable_conflict_prevention(client):
    admin_token = get_token(client, "admin@camponu.edu", "Admin@123")

    # 1. Section collision: Section 1 is already booked on Monday 09:00
    sec_conflict = {
        "day_of_week": "Monday",
        "start_time": "09:00",
        "end_time": "10:00",
        "subject_id": 2,
        "staff_id": 2,
        "section_id": 1,
        "room_number": "Hall 305",
    }
    res = client.post("/api/v1/admin/timetable/slots", json=sec_conflict, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400
    assert "Section is already scheduled" in res.json()["error"]["message"]

    # 2. Staff collision: Faculty 1 (Alan Turing) is already teaching on Monday 09:00
    staff_conflict = {
        "day_of_week": "Monday",
        "start_time": "09:00",
        "end_time": "10:00",
        "subject_id": 2,
        "staff_id": 1,
        "section_id": 2,
        "room_number": "Hall 305",
    }
    res2 = client.post("/api/v1/admin/timetable/slots", json=staff_conflict, headers={"Authorization": f"Bearer {admin_token}"})
    assert res2.status_code == 400
    assert "faculty member is already teaching" in res2.json()["error"]["message"]

    # 3. Room collision: Room "Hall 301" is already booked on Monday 09:00
    room_conflict = {
        "day_of_week": "Monday",
        "start_time": "09:00",
        "end_time": "10:00",
        "subject_id": 2,
        "staff_id": 2,
        "section_id": 2,
        "room_number": "Hall 301",
    }
    res3 = client.post("/api/v1/admin/timetable/slots", json=room_conflict, headers={"Authorization": f"Bearer {admin_token}"})
    assert res3.status_code == 400
    assert "already occupied" in res3.json()["error"]["message"]


def test_staff_attendance_submission_and_duplicate_prevention(client):
    staff_token = get_token(client, "alan.turing@camponu.edu", "Staff@123")

    unique_slot = f"{14 + (int(datetime.now().timestamp()) % 8):02d}:00"
    unique_end = f"{int(unique_slot[:2]) + 1:02d}:00"
    unique_date = "2026-12-05"
    payload = {
        "subject_id": 1,
        "section_id": 1,
        "session_date": unique_date,
        "start_time": unique_slot,
        "end_time": unique_end,
        "topic": "Graph Algorithms and Dynamic Programming",
        "records": [
            {"student_id": 1, "status": "present", "remarks": "Active participation"},
            {"student_id": 2, "status": "late", "remarks": "Joined 5 min late"},
        ],
    }

    db = SessionLocal()
    try:
        # First submission succeeds
        sub_res = client.post("/api/v1/staff/attendance/submit", json=payload, headers={"Authorization": f"Bearer {staff_token}"})
        assert sub_res.status_code == 200
        assert sub_res.json()["success"] is True

        # Immediate duplicate submission for same subject, section, date, time must fail with 400
        dup_res = client.post("/api/v1/staff/attendance/submit", json=payload, headers={"Authorization": f"Bearer {staff_token}"})
        assert dup_res.status_code == 400
        assert "Duplicate sessions are not allowed" in dup_res.json()["error"]["message"]
    finally:
        db.query(AttendanceSession).filter(
            AttendanceSession.session_date == unique_date,
            AttendanceSession.start_time == unique_slot,
        ).delete()
        db.commit()
        db.close()


def test_staff_assessment_creation_and_marks_validation(client):
    staff_token = get_token(client, "alan.turing@camponu.edu", "Staff@123")

    unique_title = f"Data Structures Surprise Quiz {int(datetime.now().timestamp())}"
    create_payload = {
        "subject_id": 1,
        "section_id": 1,
        "title": unique_title,
        "assessment_type": "quiz",
        "max_marks": 50.0,
        "weightage_percent": 10.0,
    }
    create_res = client.post("/api/v1/staff/assessments", json=create_payload, headers={"Authorization": f"Bearer {staff_token}"})
    assert create_res.status_code == 200
    assessment_id = create_res.json()["assessment_id"]

    db = SessionLocal()
    try:
        # 2. Enter invalid score exceeding max_marks (score 65 > max 50) -> Rejected with 400
        invalid_marks_payload = {
            "marks": [
                {"student_id": 1, "score_obtained": 65.0, "grade": "A+", "feedback": "Superb"},
            ]
        }
        inv_res = client.post(f"/api/v1/staff/assessments/{assessment_id}/marks", json=invalid_marks_payload, headers={"Authorization": f"Bearer {staff_token}"})
        assert inv_res.status_code == 400
        assert "exceeds maximum allowed marks" in inv_res.json()["error"]["message"]

        # 3. Enter valid score (score 48 <= max 50) -> Accepted with 200
        valid_marks_payload = {
            "marks": [
                {"student_id": 1, "score_obtained": 48.0, "grade": "A+", "feedback": "Excellent work"},
            ]
        }
        val_res = client.post(f"/api/v1/staff/assessments/{assessment_id}/marks", json=valid_marks_payload, headers={"Authorization": f"Bearer {staff_token}"})
        assert val_res.status_code == 200
        assert val_res.json()["success"] is True
    finally:
        db.query(Assessment).filter(Assessment.id == assessment_id).delete()
        db.commit()
        db.close()


def test_marks_publication_workflow(client):
    staff_token = get_token(client, "alan.turing@camponu.edu", "Staff@123")
    student_token = get_token(client, "student@camponu.edu", "Student@123")

    unique_title = f"Confidential Assessment {int(datetime.now().timestamp())}"
    # Create unpublished assessment
    assessment_res = client.post(
        "/api/v1/staff/assessments",
        json={
            "subject_id": 1,
            "section_id": 1,
            "title": unique_title,
            "assessment_type": "internal_2",
            "max_marks": 100.0,
            "weightage_percent": 20.0,
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assessment_id = assessment_res.json()["assessment_id"]

    db = SessionLocal()
    try:
        # Enter student mark
        client.post(
            f"/api/v1/staff/assessments/{assessment_id}/marks",
            json={"marks": [{"student_id": 1, "score_obtained": 92.0, "grade": "A+"}]},
            headers={"Authorization": f"Bearer {staff_token}"},
        )

        # Student checks marks: unpublished assessment MUST NOT be visible
        stud_res_before = client.get("/api/v1/student/marks", headers={"Authorization": f"Bearer {student_token}"})
        titles_before = [m["assessment_title"] for m in stud_res_before.json()["marks"]]
        assert unique_title not in titles_before

        # Staff publishes the assessment
        pub_res = client.post(
            f"/api/v1/staff/assessments/{assessment_id}/toggle-publish",
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert pub_res.status_code == 200

        # Student checks marks again: now the published assessment MUST be visible
        stud_res_after = client.get("/api/v1/student/marks", headers={"Authorization": f"Bearer {student_token}"})
        titles_after = [m["assessment_title"] for m in stud_res_after.json()["marks"]]
        assert unique_title in titles_after
    finally:
        db.query(Assessment).filter(Assessment.id == assessment_id).delete()
        db.commit()
        db.close()


def test_student_assignment_submission(client):
    student_token = get_token(client, "student@camponu.edu", "Student@123")

    # Submit assignment 1
    sub_payload = {
        "submission_text": "Completed the Red-Black Tree implementation with AVL comparison benchmark.",
    }
    res = client.post("/api/v1/student/assignments/1/submit", json=sub_payload, headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Attempting to submit to nonexistent assignment returns 404
    nonexistent_res = client.post("/api/v1/student/assignments/99999/submit", json=sub_payload, headers={"Authorization": f"Bearer {student_token}"})
    assert nonexistent_res.status_code == 404


def test_announcements_audience_and_publishing(client):
    admin_token = get_token(client, "admin@camponu.edu", "Admin@123")
    student_token = get_token(client, "student@camponu.edu", "Student@123")

    # Publish announcement
    pub_res = client.post(
        "/api/v1/announcements",
        json={
            "title": "Semester Final Exam Registration Open",
            "content": "All students must verify their registered elective subjects by Friday.",
            "target_audience": "all",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert pub_res.status_code == 200

    # Student retrieves announcements
    res = client.get("/api/v1/announcements", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 200
    titles = [a["title"] for a in res.json()]
    assert "Semester Final Exam Registration Open" in titles


def test_admin_academic_structure_and_reports(client):
    admin_token = get_token(client, "admin@camponu.edu", "Admin@123")

    # 1. Create a Department
    unique_dept_code = f"BIO{int(datetime.now().timestamp()) % 10000}"
    dept_res = client.post(
        "/api/v1/admin/departments",
        json={"code": unique_dept_code, "name": "Department of Biotechnology", "head_of_dept": "Dr. Rosalind Franklin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert dept_res.status_code == 200
    assert dept_res.json()["code"] == unique_dept_code

    # 2. Export Student Enrolment CSV
    csv_res = client.get("/api/v1/reports/students.csv", headers={"Authorization": f"Bearer {admin_token}"})
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Register Number" in csv_res.text
    assert "student@camponu.edu" in csv_res.text

    # 3. Export Attendance Summary CSV
    att_csv_res = client.get("/api/v1/reports/attendance.csv", headers={"Authorization": f"Bearer {admin_token}"})
    assert att_csv_res.status_code == 200
    assert "text/csv" in att_csv_res.headers["content-type"]
    assert "Attendance Percentage" in att_csv_res.text


def test_student_examinations_and_support_tickets(client):
    student_token = get_token(client, "student@camponu.edu", "Student@123")
    admin_token = get_token(client, "admin@camponu.edu", "Admin@123")

    # 1. View examinations
    exam_res = client.get("/api/v1/student/examinations", headers={"Authorization": f"Bearer {student_token}"})
    assert exam_res.status_code == 200
    data = exam_res.json()
    assert "examinations" in data

    # 2. File a support ticket
    ticket_payload = {
        "category": "Academics",
        "subject": "Inquiry regarding elective registration deadline",
        "description": "Could you please confirm the deadline for elective add/drop?",
        "priority": "medium",
    }
    ticket_res = client.post("/api/v1/student/support-tickets", json=ticket_payload, headers={"Authorization": f"Bearer {student_token}"})
    assert ticket_res.status_code == 200
    ticket_id = ticket_res.json()["ticket_id"]

    # 3. Verify ticket appears in student list
    my_tickets = client.get("/api/v1/student/support-tickets", headers={"Authorization": f"Bearer {student_token}"})
    assert my_tickets.status_code == 200
    ticket_subjects = [t["subject"] for t in my_tickets.json()["tickets"]]
    assert "Inquiry regarding elective registration deadline" in ticket_subjects

    # 4. Admin updates ticket status
    update_res = client.put(
        f"/api/v1/admin/support-tickets/{ticket_id}/status?status=resolved",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update_res.status_code == 200


def test_notifications_workflow(client):
    student_token = get_token(client, "student@camponu.edu", "Student@123")

    # Fetch notifications
    notif_res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {student_token}"})
    assert notif_res.status_code == 200
    data = notif_res.json()
    assert "notifications" in data
    assert "unread_count" in data

    # Mark all read
    read_res = client.post("/api/v1/notifications/read-all", headers={"Authorization": f"Bearer {student_token}"})
    assert read_res.status_code == 200
    assert read_res.json()["success"] is True

