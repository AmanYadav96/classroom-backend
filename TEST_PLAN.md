# Master Software Test Plan — Classroom Management System

**Document Version**: 1.0  
**Status**: Approved / Code-Verified  
**Author**: Senior QA Engineer & Software Test Architect  
**Target Repositories**: 
- Backend: [`classroom-backend`](file:///d:/classroom/classroom-backend) (`https://github.com/Samarth58/classroom-backend-new`)
- Frontend: [`classroom-frontend`](file:///d:/classroom/classroom-frontend) (`https://github.com/Samarth58/classroom-copy`)

---

## 1. Executive Summary & Document Control

This Master Test Plan defines the comprehensive quality assurance strategy, test coverage matrix, risk assessment, and verification protocols for the Classroom Management System. It is constructed through direct static analysis and empirical verification of the live codebase.

### Scope Summary
The system under test (SUT) is a distributed web application managing academic structures (**Department → Subject → Class → Enrollment**) and user access roles (`admin`, `teacher`, `student`).

---

## 2. Code-Verified Feature Inventory

Per the **Critical Accuracy Rule**, all features have been audited against the codebase and categorized strictly based on actual implementation status:

| Category | Component / Feature | Code Location | Status & Verification Details |
|---|---|---|---|
| **1. Implemented** | **Department Management (CRUD)** | Backend: [`src/routes/departments.ts:9-126`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L9)<br>Frontend: [`src/pages/departments/`](file:///d:/classroom/classroom-frontend/src/pages/departments) | Full list, search (code/name), pagination, create, view, edit, delete. |
| **1. Implemented** | **Subject Management (CRUD)** | Backend: [`src/routes/subjects.ts:11-146`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L11)<br>Frontend: [`src/pages/subjects/`](file:///d:/classroom/classroom-frontend/src/pages/subjects) | Full list, search, department filtering, create, view, edit, delete. |
| **1. Implemented** | **Class Management (CRUD)** | Backend: [`src/routes/classes.ts:9-229`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L9)<br>Frontend: [`src/pages/classes/`](file:///d:/classroom/classroom-frontend/src/pages/classes) | List, search, subject/teacher filter, create (auto inviteCode), view with joins, edit, delete. |
| **1. Implemented** | **User Management (CRUD)** | Backend: [`src/routes/users.ts:11-145`](file:///d:/classroom/classroom-backend/src/routes/users.ts#L11)<br>Frontend: [`src/pages/users/`](file:///d:/classroom/classroom-frontend/src/pages/users) | List, search (name/email), role filter, manual creation (`admin` only), view, edit, delete. |
| **1. Implemented** | **Class Enrollments** | Backend: [`src/routes/classes.ts:231-294`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L231) | `POST /api/classes/:id/enrollments` (validates `inviteCode` & `capacity`), `DELETE /api/classes/:id/enrollments/:studentId`. |
| **1. Implemented** | **Dashboard Metrics & Analytics** | Backend: [`src/routes/dashboard.ts:8-81`](file:///d:/classroom/classroom-backend/src/routes/dashboard.ts#L8)<br>Frontend: [`src/pages/dashboard.tsx`](file:///d:/classroom/classroom-frontend/src/pages/dashboard.tsx) | Aggregates user distribution, classes per department (raw SQL), and class capacity status. |
| **1. Implemented** | **Database Schema Integrity** | Backend: [`src/db/schema/app.ts`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts), [`auth.ts`](file:///d:/classroom/classroom-backend/src/db/schema/auth.ts) | Enforces `restrict` on Dept delete & Teacher delete; `cascade` on Subject delete & Enrollments. |
| **2. Partially Implemented** | **Arcjet Security & Rate Limiting** | Backend: [`src/middleware/security.ts:18`](file:///d:/classroom/classroom-backend/src/middleware/security.ts#L18) | Configured & mounted globally, but **bypassed in non-production/test** (`if (process.env.NODE_ENV !== "production") return next()`). |
| **2. Partially Implemented** | **Role-Based Access Control** | Backend: [`src/middleware/auth.ts:7-30`](file:///d:/classroom/classroom-backend/src/middleware/auth.ts#L7) | `requireAuth` attached to POST/PATCH/DELETE endpoints. All `GET` routes are unprotected. |
| **3. Configured but Not Verified** | **Better Auth Session System** | Backend: [`src/lib/auth.ts:14-36`](file:///d:/classroom/classroom-backend/src/lib/auth.ts#L14)<br>Frontend: [`src/constants/index.ts:46`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L46) | `better-auth` package is installed and handler mounted at `/api/auth/*`. No frontend auth provider integrated into Refine. |
| **4. Not Implemented** | **Frontend Login / Registration UI** | Frontend: [`src/App.tsx:56-64,120-162`](file:///d:/classroom/classroom-frontend/src/App.tsx#L56) | `App.tsx` has **no routes for `/login` or `/register`**, and `<Refine>` omits `authProvider`. |
| **4. Not Implemented** | **Zod Request Validation Middleware** | Backend: [`src/middleware/validate.ts:23-81`](file:///d:/classroom/classroom-backend/src/middleware/validate.ts#L23) | `validateQuery`, `validateParams`, `validateBody` are defined but **never attached** to any API route. |
| **4. Not Implemented** | **Automated Test Suite (Jest / Vitest)** | Backend & Frontend `package.json` | Neither repository includes test runner dependencies (`vitest`, `jest`, `supertest`) or test scripts in `package.json`. |
| **5. Future Enhancement** | **Nested Resource Endpoints** | Backend: [`src/routes/departments.ts`](file:///d:/classroom/classroom-backend/src/routes/departments.ts) | Endpoints like `/api/departments/:id/subjects` or `/api/users/:id/departments` are not present in current route handlers. |

---

## 3. System Architecture & Component Mapping

```
[ Browser Client ]
       │
       ▼ (HTTP REST with Credentials)
[ Refine.js Data Provider ] ──(src/providers/data.ts)──▶ [ Express 5 App ] (src/app.ts)
                                                                 │
      ┌─────────────────────────┬───────────────────────────────┴────────────────────────┐
      ▼                         ▼                                                        ▼
[ CORS & Logger ]     [ Arcjet Rate Limit ]                                   [ Better Auth Engine ]
(src/middleware/)     (src/middleware/security.ts)                            (src/lib/auth.ts /api/auth/*)
                                │                                                        │
                                └───────────────────────┬────────────────────────────────┘
                                                        ▼
                                           [ Protected Route Handlers ]
                                           (requireAuth middleware)
                                                        │
                                                        ▼
                                         [ Drizzle ORM + Neon PostgreSQL ]
                                         (src/db/schema/app.ts & auth.ts)
```

---

## 4. Test Strategy & Execution Approach

Due to the absence of pre-existing automated test suites in `package.json`, testing must be executed through a hybrid strategy:
1. **API Integration Automation**: Using Postman/Supertest scripts targeting `http://localhost:8000/api`.
2. **Database State Verification**: Using SQL assertions against Neon PostgreSQL (`drizzle.config.ts`).
3. **Frontend E2E & Visual Verification**: Manual and Playwright-driven testing on `http://localhost:5173`.

---

## 5. Detailed Test Specifications

### Module A: Authentication & Security Test Suite

| Test ID | Test Scenario | Execution Steps | Expected Result | Verified Code Reference |
|---|---|---|---|---|
| **AUTH-01** | Unauthenticated Mutation Access | Send `POST /api/departments` without session cookie | HTTP `401 Unauthorized` with `{ error: "Unauthorized" }` | [`src/middleware/auth.ts:15`](file:///d:/classroom/classroom-backend/src/middleware/auth.ts#L15) |
| **AUTH-02** | Role-Forbidden Access | Send `POST /api/users` using a valid `student` session cookie | HTTP `403 Forbidden` with `{ error: "Forbidden" }` | [`src/middleware/auth.ts:22`](file:///d:/classroom/classroom-backend/src/middleware/auth.ts#L22) |
| **AUTH-03** | Public GET Endpoint Access | Send `GET /api/departments` without any session headers | HTTP `200 OK` with paginated department list | [`src/routes/departments.ts:9`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L9) |
| **SEC-01** | CORS Origin Validation | Send `OPTIONS /api/subjects` with header `Origin: http://unauthorized-site.com` | Request blocked by CORS; error response returned | [`src/app.ts:39`](file:///d:/classroom/classroom-backend/src/app.ts#L39) |
| **SEC-02** | Arcjet Rate Limiting (Production) | Set `NODE_ENV=production` and trigger >5 requests/min as guest | HTTP `429 Too Many Requests` with rate limit error message | [`src/middleware/security.ts:68`](file:///d:/classroom/classroom-backend/src/middleware/security.ts#L68) |

### Module B: Database Schema & Referential Integrity

| Test ID | Test Scenario | Execution Steps | Expected Result | Verified Code Reference |
|---|---|---|---|---|
| **DB-01** | Department Delete Restrict Rule | Attempt `DELETE /api/departments/:id` on a department containing active subjects | Foreign key restriction throws HTTP `500` / DB Error; department is NOT deleted | [`src/db/schema/app.ts:33`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L33) (`onDelete: 'restrict'`) |
| **DB-02** | Subject Delete Cascade Rule | Send `DELETE /api/subjects/:id` for a subject linked to 3 classes | Subject is deleted, and all 3 linked classes are automatically removed from DB | [`src/db/schema/app.ts:42`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L42) (`onDelete: 'cascade'`) |
| **DB-03** | Class Enrollments Composite PK | Send `POST /api/classes/:id/enrollments` twice for same `(studentId, classId)` | First succeeds (`200`); second fails with DB unique constraint conflict | [`src/db/schema/app.ts:62-63`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L62) |
| **DB-04** | Class Capacity Enforcement | Send enrollment request to a class where `currentEnrollments >= capacity` | Request rejected with HTTP `400 Bad Request`, `{ error: "Class is at full capacity" }` | [`src/routes/classes.ts:257-259`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L257) |
| **DB-05** | Invite Code Verification | Send enrollment request with incorrect `inviteCode` | Request rejected with HTTP `400 Bad Request`, `{ error: "Invalid invite code" }` | [`src/routes/classes.ts:248-250`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L248) |

### Module C: API Endpoints & Response Envelope Test Suite

| Test ID | Test Scenario | Input Data | Expected Response Envelope | Verified Code Reference |
|---|---|---|---|---|
| **API-01** | Department List Pagination | `GET /api/departments?page=1&limit=5` | `{ data: [...], pagination: { page: 1, limit: 5, total, totalPages } }` | [`src/routes/departments.ts:50-58`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L50) |
| **API-02** | Class Detail Joins | `GET /api/classes/:id` | `{ data: { ...classFields, subject: {...}, department: {...}, teacher: {...} } }` | [`src/routes/classes.ts:185-196`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L185) |
| **API-03** | Dashboard Metrics Overview | `GET /api/dashboard/metrics` | `{ metrics: { totalUsers, totalClasses, ... }, charts: { userDistribution, ... } }` | [`src/routes/dashboard.ts:64-76`](file:///d:/classroom/classroom-backend/src/routes/dashboard.ts#L64) |
| **API-04** | Class User Filtering | `GET /api/classes/:id/users?role=student` | `{ data: [studentUsers], pagination: {...} }` | [`src/routes/classes.ts:136-163`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L136) |

### Module D: Frontend UI & Refine.js Integration

| Test ID | Test Scenario | User Actions | Expected UI Behavior | Verified Code Reference |
|---|---|---|---|---|
| **UI-01** | Subject List Department Filter | Select department in subject list page filter dropdown | Refine provider transforms filter to `?department=Name` and updates grid | [`src/providers/data.ts:56-59`](file:///d:/classroom/classroom-frontend/src/providers/data.ts#L56) |
| **UI-02** | Class Search Input | Type class name in search input on `/classes` | Refine provider transforms filter to `?search=Name` and triggers search | [`src/providers/data.ts:67-69`](file:///d:/classroom/classroom-frontend/src/providers/data.ts#L67) |
| **UI-03** | Empty Table State | Navigate to `/departments` when no departments exist | Displays UI empty table state with create action prompt | [`src/pages/departments/list.tsx`](file:///d:/classroom/classroom-frontend/src/pages/departments/list.tsx) |
| **UI-04** | Form Validation Feedback | Submit `/subjects/create` with empty `code` or `name` | Renders inline Zod error messages under invalid form fields | [`src/lib/schema.ts`](file:///d:/classroom/classroom-frontend/src/lib/schema.ts) |

---

## 6. Matrix of Role-Based Access Controls (RBAC)

Below is the ground-truth authorization matrix enforced by `requireAuth` in the backend:

| Endpoint | Guest / Public | Student | Teacher | Admin | Code Reference |
|---|---|---|---|---|---|
| `GET /api/departments` | Allowed | Allowed | Allowed | Allowed | [`departments.ts:9`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L9) |
| `POST /api/departments` | Denied (401) | Denied (403) | Allowed | Allowed | [`departments.ts:65`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L65) |
| `DELETE /api/departments/:id` | Denied (401) | Denied (403) | Denied (403) | Allowed | [`departments.ts:115`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L115) |
| `GET /api/subjects` | Allowed | Allowed | Allowed | Allowed | [`subjects.ts:11`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L11) |
| `POST /api/subjects` | Denied (401) | Denied (403) | Allowed | Allowed | [`subjects.ts:81`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L81) |
| `DELETE /api/subjects/:id` | Denied (401) | Denied (403) | Denied (403) | Allowed | [`subjects.ts:135`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L135) |
| `GET /api/classes` | Allowed | Allowed | Allowed | Allowed | [`classes.ts:9`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L9) |
| `POST /api/classes` | Denied (401) | Denied (403) | Allowed | Allowed | [`classes.ts:81`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L81) |
| `POST /api/classes/:id/enrollments` | Denied (401) | Allowed | Allowed | Allowed | [`classes.ts:231`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L231) |
| `GET /api/users` | Allowed | Allowed | Allowed | Allowed | [`users.ts:11`](file:///d:/classroom/classroom-backend/src/routes/users.ts#L11) |
| `POST /api/users` | Denied (401) | Denied (403) | Denied (403) | Allowed | [`users.ts:77`](file:///d:/classroom/classroom-backend/src/routes/users.ts#L77) |

---

## 7. Defect Risk Management & Entry/Exit Criteria

### Entry Criteria for Test Execution Phase
1. Database migrations (`npm run db:migrate`) completed successfully against Neon test database.
2. Backend server running on `http://localhost:8000` with active `.env` configuration.
3. Frontend Vite server running on `http://localhost:5173` without build compilation errors.

### Exit Criteria (Sign-Off Requirements)
1. **0 High/Critical Blockers**: All database integrity constraints (cascade vs restrict) pass validation.
2. **100% Core CRUD Verification**: Department, Subject, Class, and User CRUD operations function error-free.
3. **Enrollment Boundary Check**: Class capacity limits and invite code validation verified.
4. **Documentation Sync**: Any newly implemented endpoint added to API documentation before release.
