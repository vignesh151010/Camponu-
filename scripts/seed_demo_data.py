"""
CAMPON U — Comprehensive Demo Data Seeding Script
Populates the database with realistic departments, courses, faculty, students,
timetable, attendance, marks, assignments, fees, library loans, and notices.
"""

import sys
import os
from datetime import date, datetime, timedelta, timezone

# Ensure UTF-8 console output on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal, check_db_connection
from app.models.user import User, UserRole
from app.models.academic import (
    Department, Course, Semester, Section, Subject,
    StudentProfile, StaffProfile, StaffAssignment
)
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.models.marks import Assessment, AssessmentType, Mark
from app.models.timetable import TimetableSlot
from app.models.assignment import Assignment, AssignmentSubmission, StudyMaterial, SubmissionStatus
from app.models.services import (
    FeeStructure, StudentFeeRecord, FeeStatus,
    Book, BookLoan, LoanStatus, Announcement, AudienceType, Notification
)


def seed():
    print("[CONNECT] Connecting to CAMPON U Database...")
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_admin = db.query(User).filter(User.email == "admin@camponu.edu").first()
        if existing_admin:
            print("[INFO] Demo data already detected in database. Skipping duplicate seed.")
            return

        print("[SEED] Seeding Departments...")
        dept_cse = Department(code="CSE", name="Computer Science & Engineering", head_of_dept="Dr. Grace Hopper")
        dept_ece = Department(code="ECE", name="Electronics & Communication", head_of_dept="Dr. Claude Shannon")
        dept_mech = Department(code="MECH", name="Mechanical Engineering", head_of_dept="Dr. Nikola Tesla")
        db.add_all([dept_cse, dept_ece, dept_mech])
        db.flush()

        print("[SEED] Seeding Degree Courses...")
        course_cse = Course(department_id=dept_cse.id, code="BTECH-CSE", name="B.Tech in Computer Science & Engineering", duration_years=4, total_semesters=8)
        course_ece = Course(department_id=dept_ece.id, code="BTECH-ECE", name="B.Tech in Electronics & Communication", duration_years=4, total_semesters=8)
        db.add_all([course_cse, course_ece])
        db.flush()

        print("[SEED] Seeding Academic Terms & Sections...")
        sem4 = Semester(course_id=course_cse.id, semester_number=4, academic_year="2026-2027")
        db.add(sem4)
        db.flush()

        sec_a = Section(semester_id=sem4.id, name="A", capacity=60)
        sec_b = Section(semester_id=sem4.id, name="B", capacity=60)
        db.add_all([sec_a, sec_b])
        db.flush()

        print("[SEED] Seeding Academic Subjects...")
        sub_dsa = Subject(course_id=course_cse.id, semester_number=4, code="CS401", name="Data Structures & Algorithms", credits=4)
        sub_dbms = Subject(course_id=course_cse.id, semester_number=4, code="CS402", name="Database Management Systems", credits=4)
        sub_os = Subject(course_id=course_cse.id, semester_number=4, code="CS403", name="Operating Systems & Architecture", credits=3)
        sub_ai = Subject(course_id=course_cse.id, semester_number=4, code="CS404", name="Artificial Intelligence & ML", credits=3)
        db.add_all([sub_dsa, sub_dbms, sub_os, sub_ai])
        db.flush()

        print("[SEED] Seeding Core User Accounts (Admin, Staff, Students)...")
        # Admin
        user_admin = User(
            email="admin@camponu.edu",
            register_number="ADM-001",
            full_name="Chancellor Robert Vance",
            password_hash=hash_password("Admin@123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(user_admin)

        # Faculty 1 (Alan Turing)
        user_turing = User(
            email="alan.turing@camponu.edu",
            register_number="FAC-CSE-001",
            full_name="Prof. Alan Turing",
            password_hash=hash_password("Staff@123"),
            role=UserRole.STAFF,
            is_active=True,
        )
        db.add(user_turing)
        db.flush()

        staff_turing = StaffProfile(
            user_id=user_turing.id,
            department_id=dept_cse.id,
            designation="Professor & Research Chair",
            specialization="Theoretical CS & Algorithms",
        )
        db.add(staff_turing)

        # Faculty 2 (Ada Lovelace)
        user_ada = User(
            email="ada.lovelace@camponu.edu",
            register_number="FAC-CSE-002",
            full_name="Dr. Ada Lovelace",
            password_hash=hash_password("Staff@123"),
            role=UserRole.STAFF,
            is_active=True,
        )
        db.add(user_ada)
        db.flush()

        staff_ada = StaffProfile(
            user_id=user_ada.id,
            department_id=dept_cse.id,
            designation="Associate Professor",
            specialization="Database Engines & Software Architecture",
        )
        db.add(staff_ada)
        db.flush()

        # Student 1 (Karthikeyan / Demo Student)
        user_student1 = User(
            email="student@camponu.edu",
            register_number="2026CSE001",
            full_name="Karthikeyan S.",
            password_hash=hash_password("Student@123"),
            role=UserRole.STUDENT,
            is_active=True,
        )
        db.add(user_student1)
        db.flush()

        student_karthik = StudentProfile(
            user_id=user_student1.id,
            department_id=dept_cse.id,
            course_id=course_cse.id,
            semester_id=sem4.id,
            section_id=sec_a.id,
            admission_year=2024,
            cgpa=8.85,
        )
        db.add(student_karthik)

        # Student 2 (Sarah Jenkins)
        user_student2 = User(
            email="sarah.jenkins@camponu.edu",
            register_number="2026CSE002",
            full_name="Sarah Jenkins",
            password_hash=hash_password("Student@123"),
            role=UserRole.STUDENT,
            is_active=True,
        )
        db.add(user_student2)
        db.flush()

        student_sarah = StudentProfile(
            user_id=user_student2.id,
            department_id=dept_cse.id,
            course_id=course_cse.id,
            semester_id=sem4.id,
            section_id=sec_a.id,
            admission_year=2024,
            cgpa=9.12,
        )
        db.add(student_sarah)
        db.flush()

        print("[SEED] Seeding Faculty Course Assignments...")
        assign_dsa = StaffAssignment(staff_id=staff_turing.id, subject_id=sub_dsa.id, section_id=sec_a.id, academic_year="2026-2027")
        assign_ai = StaffAssignment(staff_id=staff_turing.id, subject_id=sub_ai.id, section_id=sec_a.id, academic_year="2026-2027")
        assign_dbms = StaffAssignment(staff_id=staff_ada.id, subject_id=sub_dbms.id, section_id=sec_a.id, academic_year="2026-2027")
        assign_os = StaffAssignment(staff_id=staff_ada.id, subject_id=sub_os.id, section_id=sec_a.id, academic_year="2026-2027")
        db.add_all([assign_dsa, assign_ai, assign_dbms, assign_os])
        db.flush()

        print("[SEED] Seeding Weekly Timetable Slots...")
        timetable_data = [
            ("Monday", "09:00", "10:00", sub_dsa.id, staff_turing.id, sec_a.id, "Hall 301"),
            ("Monday", "10:15", "11:15", sub_dbms.id, staff_ada.id, sec_a.id, "Hall 301"),
            ("Monday", "11:30", "12:30", sub_os.id, staff_ada.id, sec_a.id, "Lab 2"),
            ("Tuesday", "09:00", "10:00", sub_ai.id, staff_turing.id, sec_a.id, "Hall 302"),
            ("Tuesday", "10:15", "11:15", sub_dsa.id, staff_turing.id, sec_a.id, "Hall 302"),
            ("Wednesday", "09:00", "10:00", sub_dbms.id, staff_ada.id, sec_a.id, "Hall 301"),
            ("Wednesday", "10:15", "11:15", sub_ai.id, staff_turing.id, sec_a.id, "Hall 301"),
            ("Thursday", "09:00", "10:00", sub_os.id, staff_ada.id, sec_a.id, "Hall 301"),
            ("Thursday", "10:15", "11:15", sub_dsa.id, staff_turing.id, sec_a.id, "Hall 301"),
            ("Friday", "09:00", "11:00", sub_dbms.id, staff_ada.id, sec_a.id, "Database Lab"),
        ]
        for day, st, et, sub_id, stf_id, sc_id, room in timetable_data:
            db.add(TimetableSlot(
                day_of_week=day,
                start_time=st,
                end_time=et,
                subject_id=sub_id,
                staff_id=stf_id,
                section_id=sc_id,
                room_number=room,
            ))
        db.flush()

        print("[SEED] Seeding Past Attendance Sessions & Records...")
        today = date.today()
        # Seed 12 sessions across last 3 weeks
        for i in range(12, 0, -1):
            sess_date = today - timedelta(days=i)
            # Skip weekends
            if sess_date.weekday() >= 5:
                continue

            sess = AttendanceSession(
                staff_id=staff_turing.id,
                subject_id=sub_dsa.id,
                section_id=sec_a.id,
                session_date=sess_date,
                start_time="09:00",
                end_time="10:00",
                topic=f"Lecture {13 - i}: Tree Rotations and Graph Analysis",
            )
            db.add(sess)
            db.flush()

            # Record for Karthik (mostly present, one late)
            status_karthik = AttendanceStatus.PRESENT if i != 3 else AttendanceStatus.LATE
            db.add(AttendanceRecord(session_id=sess.id, student_id=student_karthik.id, status=status_karthik))
            # Record for Sarah (present)
            db.add(AttendanceRecord(session_id=sess.id, student_id=student_sarah.id, status=AttendanceStatus.PRESENT))

        db.flush()

        print("[SEED] Seeding Assessments & Published Marks...")
        # Assessment 1
        ass1 = Assessment(
            subject_id=sub_dsa.id,
            section_id=sec_a.id,
            staff_id=staff_turing.id,
            title="Internal Assessment 1 — Advanced Data Structures",
            assessment_type=AssessmentType.INTERNAL_1,
            max_marks=50.0,
            weightage_percent=25.0,
            is_published=True,
        )
        db.add(ass1)
        db.flush()

        db.add(Mark(assessment_id=ass1.id, student_id=student_karthik.id, score_obtained=47.5, grade="A+", feedback="Excellent implementation of AVL Trees."))
        db.add(Mark(assessment_id=ass1.id, student_id=student_sarah.id, score_obtained=49.0, grade="A+", feedback="Flawless proofs and Big-O runtime analysis."))

        # Assessment 2
        ass2 = Assessment(
            subject_id=sub_dbms.id,
            section_id=sec_a.id,
            staff_id=staff_ada.id,
            title="Internal Assessment 1 — Relational Calculus & Indexing",
            assessment_type=AssessmentType.INTERNAL_1,
            max_marks=50.0,
            weightage_percent=25.0,
            is_published=True,
        )
        db.add(ass2)
        db.flush()

        db.add(Mark(assessment_id=ass2.id, student_id=student_karthik.id, score_obtained=45.0, grade="A", feedback="Great SQL query optimization."))
        db.add(Mark(assessment_id=ass2.id, student_id=student_sarah.id, score_obtained=48.5, grade="A+", feedback="Superior normalization schema."))
        db.flush()

        print("[SEED] Seeding Assignments & Submissions...")
        asgn1 = Assignment(
            subject_id=sub_dsa.id,
            section_id=sec_a.id,
            staff_id=staff_turing.id,
            title="Assignment 1: Red-Black Tree Implementation",
            description="Implement insertion, deletion, and balancing for Red-Black trees in Python with unit tests.",
            due_date=datetime.now(timezone.utc) + timedelta(days=5),
            max_score=100.0,
        )
        db.add(asgn1)
        db.flush()

        # Karthik already submitted
        db.add(AssignmentSubmission(
            assignment_id=asgn1.id,
            student_id=student_karthik.id,
            submission_text="Submitted GitHub repository link with comprehensive Pytest unit tests for all rotation cases.",
            status=SubmissionStatus.GRADED,
            score=96.0,
            feedback="Superb code clarity and clean algorithmic assertions.",
            graded_at=datetime.now(timezone.utc),
        ))

        asgn2 = Assignment(
            subject_id=sub_dbms.id,
            section_id=sec_a.id,
            staff_id=staff_ada.id,
            title="Assignment 2: Query Execution Plan Benchmarks",
            description="Profile query latency on an unindexed table vs clustered B+ Tree index with 500,000 rows.",
            due_date=datetime.now(timezone.utc) + timedelta(days=9),
            max_score=100.0,
        )
        db.add(asgn2)
        db.flush()

        print("[SEED] Seeding Study Materials...")
        mat1 = StudyMaterial(
            subject_id=sub_dsa.id,
            staff_id=staff_turing.id,
            title="Lecture Slides 01-06: Asymptotic Analysis & Balanced Trees",
            description="Complete slide deck covering Big-O, Master Theorem, AVL, and 2-3-4 Trees.",
            file_path="uploads/materials/cs401_trees.pdf",
            file_size_bytes=2480000,
        )
        mat2 = StudyMaterial(
            subject_id=sub_dbms.id,
            staff_id=staff_ada.id,
            title="DBMS Architecture & Transaction ACID Properties Cheatsheet",
            description="Comprehensive review sheet for Concurrency Control and Write-Ahead Logging.",
            file_path="uploads/materials/cs402_acid.pdf",
            file_size_bytes=1840000,
        )
        db.add_all([mat1, mat2])

        print("[SEED] Seeding Fee Structures & Student Balances...")
        fee_struct = FeeStructure(
            course_id=course_cse.id,
            semester_number=4,
            academic_year="2026-2027",
            title="Semester 4 Tuition & Academic Facilities Fee",
            amount=2500.00,
            due_date=today + timedelta(days=30),
        )
        db.add(fee_struct)
        db.flush()

        db.add(StudentFeeRecord(
            student_id=student_karthik.id,
            fee_structure_id=fee_struct.id,
            amount_due=2500.00,
            amount_paid=2500.00,
            payment_status=FeeStatus.PAID,
            last_payment_date=datetime.now(timezone.utc) - timedelta(days=10),
            transaction_ref="TXN-CAMPON-984321",
        ))

        print("[SEED] Seeding Library Books & Borrowings...")
        book1 = Book(isbn="978-0262033848", title="Introduction to Algorithms (4th Edition)", author="Thomas H. Cormen, Charles E. Leiserson", category="Computer Science", total_copies=6, available_copies=5)
        book2 = Book(isbn="978-0078022159", title="Database System Concepts", author="Abraham Silberschatz, Henry F. Korth", category="Databases", total_copies=5, available_copies=5)
        book3 = Book(isbn="978-0131103627", title="The C Programming Language", author="Brian W. Kernighan, Dennis M. Ritchie", category="Programming", total_copies=4, available_copies=4)
        db.add_all([book1, book2, book3])
        db.flush()

        db.add(BookLoan(
            book_id=book1.id,
            student_id=student_karthik.id,
            due_date=today + timedelta(days=14),
            status=LoanStatus.ACTIVE,
            fine_amount=0.00,
        ))

        print("[SEED] Seeding Campus Announcements & Notifications...")
        ann1 = Announcement(
            title="CAMPON U Annual Hackathon & Tech Showcase",
            content="Registration is now open for the 48-hour inter-collegiate software hackathon. Grand prize of $5,000 for top AI and systems projects. Register via department portal by Friday.",
            target_audience=AudienceType.ALL,
            created_by=user_admin.id,
        )
        ann2 = Announcement(
            title="Mid-Semester Assessment Schedule Released",
            content="Internal assessment marks for CS401 and CS402 have been published to the student portal. Please review your performance and contact course faculty for clarification.",
            target_audience=AudienceType.DEPARTMENT,
            department_id=dept_cse.id,
            created_by=user_turing.id,
        )
        db.add_all([ann1, ann2])

        db.add(Notification(
            user_id=user_student1.id,
            title="Assignment Graded",
            message="Prof. Alan Turing graded your submission for 'Assignment 1: Red-Black Tree Implementation'. Score: 96/100.",
            link="/student/assignments",
            is_read=False,
        ))
        db.add(Notification(
            user_id=user_student1.id,
            title="Book Due in 14 Days",
            message="Your borrowed book 'Introduction to Algorithms' is due on " + str(today + timedelta(days=14)),
            link="/student/library",
            is_read=False,
        ))

        db.commit()
        print("[SUCCESS] CAMPON U Demo Data Seeded Completely!")
        print("==================================================================")
        print("Demo Credentials for Testing:")
        print("  * Administrator: admin@camponu.edu    | Password: Admin@123")
        print("  * Faculty Staff:  alan.turing@camponu.edu | Password: Staff@123")
        print("  * Student:        student@camponu.edu    | Password: Student@123")
        print("==================================================================")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
