# CAMPON U — Architecture Overview

## 1. System Vision & Purpose
**CAMPON U** is a modern, modular, database-driven College Operating System designed to connect Students, Staff, and Administrators in a unified, role-segregated environment.

Tagline: *One Campus. One Platform. Smarter Learning.*

---

## 2. Architectural Pattern: Modular Monolith
To ensure high developer velocity, maintainability, and clean separation of concerns without the operational complexity of microservices, CAMPON U employs a **Modular Monolith** architecture:
- **Frontend**: Single Page Application (SPA) built with React 19, Vite, React Router, and a component design system styled with custom CSS tokens.
- **Backend**: High-performance asynchronous REST API built with FastAPI (Python 3.10+), Pydantic v2 schemas, and dependency injection.
- **Data Layer**: Relational persistence managed by SQLAlchemy 2.0 ORM with schema migrations tracked and applied via Alembic.
- **AI Integration Layer**: Provider-agnostic abstraction supporting local inference via Ollama or optional cloud LLMs.

---

## 3. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              CLIENT TIER                                |
|   React SPA (Vite) - Desktop & Mobile Responsive Interfaces             |
|   +-------------------+  +--------------------+  +--------------------+ |
|   | Student Dashboard |  |  Staff Dashboard   |  |  Admin Dashboard   | |
|   +-------------------+  +--------------------+  +--------------------+ |
|                 |                   |                   |               |
|                 +-------------------+-------------------+               |
|                                     | HTTP / JSON                       |
+-------------------------------------v-----------------------------------+
|                           APPLICATION TIER                              |
|   FastAPI REST Engine                                                   |
|   +-----------------------------------------------------------------+   |
|   | Global Middleware (CORS, Request Validation, Error Handling)     |   |
|   +-----------------------------------------------------------------+   |
|   | API Routers (/api/v1/...)                                       |   |
|   |  - Auth & Sessions   - Students & Staff      - Timetable & Exams |   |
|   |  - Attendance        - Marks & Assessments   - Fees & Library    |   |
|   +-----------------------------------------------------------------+   |
|   | Core Business Logic & Repositories                              |   |
|   +-----------------------------------------------------------------+   |
|   | AI Integration Service (Allowlisted DB Tools + Provider Bridge) |   |
|   +-----------------------------------------------------------------+   |
|                                     |                                   |
+-------------------------------------v-----------------------------------+
|                              DATA TIER                                  |
|   MySQL 8.0 Relational Database / Alembic Migrations Engine             |
+-------------------------------------------------------------------------+
```

---

## 4. Key Design Principles
1. **Zero-Trust Role Enforcement**: Never trust client-supplied roles. Roles and permissions are strictly enforced server-side using authenticated sessions.
2. **Grounded AI Retrieval**: The AI assistant never executes arbitrary SQL or receives raw database credentials. It retrieves data strictly through allowlisted, permission-checked Python services.
3. **Auditability**: Critical academic operations (attendance corrections, marks updates, fee adjustments) create immutable audit logs.
4. **Resilient Error Handling**: The system fails gracefully with standardized error responses and does not leak internal stack traces to clients.
