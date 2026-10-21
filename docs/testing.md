# CAMPON U — Testing Strategy & Guide

## 1. Testing Philosophy
CAMPON U adheres to test-driven and regression-protective development:
- **Unit & Schema Tests**: Validate input constraints, model logic, and authorization rules.
- **Integration Tests**: Verify database transactions, Alembic migrations, and REST API endpoints.
- **Security & Authorization Tests**: Ensure students cannot access administrative routes or modify marks, and that multi-tenant isolation is preserved.

---

## 2. Test Suites
- `backend/tests/test_health.py`: Health check and database connectivity verification.
- `backend/tests/test_auth.py`: Authentication, session lifecycle, and invalid credential rejection.
- `backend/tests/test_permissions.py`: Role-based access control and privilege escalation prevention.
- `backend/tests/test_academics.py`: Attendance, marks calculation, timetable conflict prevention.
- `backend/tests/test_ai.py`: Grounded AI response verification and prompt injection resistance.

---

## 3. Running Automated Tests
Run tests within the backend environment:
```powershell
cd backend
.\venv\Scripts\pytest -v
```
