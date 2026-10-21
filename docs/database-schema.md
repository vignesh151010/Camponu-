# CAMPON U — Database Schema Documentation

## 1. Relational Design Philosophy
The database is structured using MySQL 8.0 with:
- Strict foreign key constraints and cascade rules.
- Unique indexes on natural identifiers (e.g., student register numbers, staff employee IDs, course codes).
- Decimal data types for monetary balances (`DECIMAL(10, 2)`).
- Timestamps for creation and last update on all core entities.

---

## 2. Core Entity Domains

### Identity & Access Control
- `users`: Core identity table (id, email, password_hash, is_active, created_at, updated_at).
- `roles`: System roles (`student`, `staff`, `admin`).
- `user_roles`: Multi-role assignment junction.
- `permissions`: Fine-grained privileges.
- `role_permissions`: Role to permission mapping.
- `user_sessions`: Server-side active session store with expiration timestamps.

### Academic Organization
- `departments`: Academic faculties (id, code, name).
- `courses`: Degree programs (id, department_id, code, name, duration_years).
- `semesters`: Term designations (id, course_id, semester_number, academic_year).
- `sections`: Class batches (id, semester_id, name).
- `subjects`: Academic subjects (id, course_id, code, name, credits).
- `student_enrollments`: Student association with department, course, section.
- `staff_assignments`: Faculty association with subjects and sections.

### Academic Operations
- `timetable_slots`: Day, time slot, subject, staff, room, and section mapping.
- `attendance_sessions`: Faculty lecture log (date, slot, subject, section).
- `attendance_records`: Individual student attendance status (present, absent, excused).
- `assessments`: Internal exams and grading events (max marks, weightage).
- `marks`: Student scores per assessment with publication status.
- `assignments`: Homework tasks, descriptions, due dates, attachments.
- `assignment_submissions`: Student submission records with uploaded file references and grades.
- `study_materials`: Course notes and lecture slide uploads.

### Student Services, Finance & Operations
- `fee_structures`: Program fee definitions by semester.
- `student_fee_records`: Student payment status and balances.
- `books` & `book_loans`: Campus library catalog and borrowing tracker.
- `leave_requests`: Student leave applications and approval workflows.
- `support_tickets`: Help desk tickets and responses.
- `announcements`: Targeted announcements (college-wide, department, section).
- `notifications`: User-specific notification inbox.
- `audit_logs`: Immutable security audit trail.
