# CAMPON U — API Architecture & Standards

## 1. REST API Conventions
- **Base URI**: `/api/v1`
- **Formats**: JSON request and response payloads with `Content-Type: application/json`.
- **Status Codes**:
  - `200 OK`: Request succeeded.
  - `201 Created`: Resource successfully created.
  - `400 Bad Request`: Validation failure or malformed payload.
  - `401 Unauthorized`: Missing or invalid session/token.
  - `403 Forbidden`: Authenticated user lacks required permission.
  - `404 Not Found`: Requested resource does not exist.
  - `422 Unprocessable Entity`: Pydantic schema validation error.
  - `500 Internal Server Error`: Unhandled server exception (sanitized output).

---

## 2. Interactive Documentation
When the backend service is running, interactive Swagger UI and ReDoc documentation are automatically exposed at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON specification: `http://127.0.0.1:8000/openapi.json`

---

## 3. Core Resource Endpoints
- `/api/v1/health`: System health status and database connectivity check.
- `/api/v1/auth/login`: User authentication and session creation.
- `/api/v1/auth/logout`: Revoke active session.
- `/api/v1/auth/me`: Current authenticated user profile with roles.
- `/api/v1/students/...`: Student records, attendance, marks, assignments.
- `/api/v1/staff/...`: Faculty assignments, class rosters, marks entry.
- `/api/v1/admin/...`: College administrative controls, timetables, accounts.
- `/api/v1/ai/...`: College assistant and study assistant endpoints.
