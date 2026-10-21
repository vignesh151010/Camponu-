# CAMPON U — AI-Powered College Operating System

> **One Campus. One Platform. Smarter Learning.**

CAMPON U is a modular, database-driven university management and intelligence platform built to connect Students, Staff, and Administrators in one unified, role-segregated environment.

---

## 1. Project Overview & URLs

CAMPON U is currently fully operational and running locally with complete full-stack functionality across all 6 phases:

| Service | Access URL | Description |
| :--- | :--- | :--- |
| **Frontend Application** | **[http://localhost:5173](http://localhost:5173)** | Student, Staff, and Administrator Web Portal |
| **Interactive API Documentation** | **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)** | OpenAPI Swagger UI for all REST endpoints |
| **Backend Engine & Health** | **[http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)** | Live system and database connectivity health probe |

---

## 2. Quick Demo Credentials

Use any of the one-click demo login buttons on the login screen or enter the credentials below:

| Role | Email / Identifier | Password | Dashboard URL | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `student@camponu.edu`<br>*(or `2026CSE001`)* | `Student@123` | `/student` | Overview, Attendance tracking, Published marks, Timetable, Assignments, Study materials, Fee records, Library loans, Leave applications, Helpdesk support, and Grounded AI College & Study Assistant |
| **Faculty / Staff** | `alan.turing@camponu.edu` | `Staff@123` | `/staff` | Profile, Assigned classes, Student roster attendance marking with duplicate prevention, Assessment creation, Marks entry & publication toggle, Assignments review, and Class timetables |
| **Administrator** | `admin@camponu.edu` | `Admin@123` | `/admin` | Institutional KPIs, Student & Staff directory, Account activation/deactivation, Academic structure (Depts, Courses, Subjects), Timetable builder with **3-way conflict detection**, Security audit logs, and CSV exports |

---

## 3. All Phases Implementation Status

### Phase 1: Foundation (Completed & Verified)
- Modular Monolith architecture with React/Vite and FastAPI.
- Normalized database schema configuration with SQLAlchemy 2.0 & Alembic migrations.
- Live system health probes, automated database ping, and standardized error handling.
- Comprehensive automated test suite with Pytest.

### Phase 2: Authentication & Security (Completed & Verified)
- Argon2id password hashing (`time_cost=3`, `memory_cost=65536`, `parallelism=4`).
- Server-side cryptographic session management with expiry, IP tracking, and audit logging.
- Role-based authorization (`require_role`) strictly enforced backend-side.
- Sliding-window rate limiting on login attempts per IP.
- One-time password reset workflow with single-use tokens and existing session revocation.

### Phase 3: Core Academic Modules (Completed & Verified)
- Hierarchical academic structure: Departments, Courses, Semesters, Sections, Subjects.
- Student & Staff profiles with course and section assignments.
- Attendance module with subject breakdown, warning thresholds (<75%), and duplicate prevention.
- Marks module with boundary validation (`score <= max_marks`) and publication restrictions.
- Timetable engine preventing section, faculty, and room double-booking (`HTTP 400`).
- Assignment distribution, student submission uploads, and grading feedback.

### Phase 4: Additional Modules & Student Services (Completed & Verified)
- **Examinations**: Semester exam scheduling, venue assignment, and student schedules.
- **Fees Management**: Tuition fee records, payment balances, and financial status tracking.
- **Library Module**: Book catalogue search, borrow records, due dates, and overdue status.
- **Leave Requests**: Student absence applications with start/end date validation and review workflow.
- **Helpdesk Support**: Student support ticket filing and administrative resolution status updates.
- **Announcements & Notifications**: Multi-tiered announcements and user notifications with unread counts.
- **Reports & Data Export**: Live streaming CSV downloads for student enrolment and college attendance summaries.

### Phase 5: AI Integration (Completed & Verified)
- **AI College Assistant**: Retrieves verified personal attendance, marks, pending assignments, today's schedule, fee balance, and library loans strictly via allowlisted SQLAlchemy queries.
- **AI Study Assistant**: Interactive computer science tutor for algorithms, data structures, databases, and programming.
- **Privacy & Isolation**: Absolute user chat session isolation; user prompts never execute arbitrary SQL.
- **Provider Abstraction**: Resilient provider layer supporting local Ollama or Cloud APIs.

### Phase 6: Final Quality & Hardening (Completed & Verified)
- 35 automated tests passing with 0 failures across authentication, authorization, academic records, and AI integration.
- Responsive design tokens, accessible form controls, and zero secrets committed.

---

## 4. Technology Stack

- **Frontend**: React, Vite, React Router, Lucide Icons, Vanilla CSS Design System.
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, Uvicorn.
- **Database**: Relational design with foreign keys, unique constraints, and transaction rollback.
- **Testing**: Pytest, FastAPI TestClient, Starlette.

---

## 5. How to Run the Project (Windows PowerShell)

### Step 1: Start Backend Server
```powershell
cd c:\Users\Karthikeyan\OneDrive\Desktop\champonu\backend
.\venv\Scripts\uvicorn app.main:app --port 8000
```

### Step 2: Start Frontend Application
```powershell
cd c:\Users\Karthikeyan\OneDrive\Desktop\champonu\frontend
npm run dev
```

### Step 3: Run Full Test Suite
```powershell
cd c:\Users\Karthikeyan\OneDrive\Desktop\champonu\backend
.\venv\Scripts\pytest -v
```

---

## 6. Security & Production Checklist

1. **HTTPS / TLS**: Configure an SSL/TLS reverse proxy (e.g., Nginx or Caddy) in front of Uvicorn in production.
2. **Secrets Management**: Supply `SECRET_KEY` and database credentials through environment variables or a vault rather than defaults.
3. **Cookie Security**: In production (`ENVIRONMENT=production`), cookies automatically enforce `Secure=True` and `SameSite=Lax`.
4. **Database Migration**: Run `alembic upgrade head` during CI/CD pipelines before deployment.
