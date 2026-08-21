# Classroom Management System — Fully Verified Developer Documentation

This document is a technical developer guide for the Classroom Management System (`classroom-backend` and `classroom-frontend`), generated from a line-by-line audit of the live codebase.

---

## 1. Verification Log

| Claim / Component | File & Line(s) Checked | Status | Audit Findings & Exact Detail |
|---|---|---|---|
| Repository Names (`classroom-copy/classroom` & `classroom-backend-new`) | Root workspace directory `d:\classroom` | **Conflict** | Actual local folders are [`classroom-backend`](file:///d:/classroom/classroom-backend) and [`classroom-frontend`](file:///d:/classroom/classroom-frontend). |
| Backend Database URL (`DATABASE_URL`) | [`classroom-backend/drizzle.config.ts:5,14`](file:///d:/classroom/classroom-backend/drizzle.config.ts#L5) <br> [`classroom-backend/src/db/index.ts:5,9`](file:///d:/classroom/classroom-backend/src/db/index.ts#L5) | **Verified** | Required in both Drizzle CLI config and Drizzle client initialization. |
| Backend Frontend URL (`FRONTEND_URL`) | [`classroom-backend/src/app.ts:16,21`](file:///d:/classroom/classroom-backend/src/app.ts#L16) <br> [`classroom-backend/src/lib/auth.ts:7`](file:///d:/classroom/classroom-backend/src/lib/auth.ts#L7) | **Verified** | Checked on startup; added to CORS origins and Better Auth trusted origins. |
| Backend Environment: `ALLOWED_ORIGINS` & `BETTER_AUTH_URL` | [`classroom-backend/src/lib/auth.ts:7,15`](file:///d:/classroom/classroom-backend/src/lib/auth.ts#L7) | **Conflict** | Omitted from original draft. Found referenced in Better Auth configuration. |
| Backend Environment: `PORT` | [`classroom-backend/src/index.ts:6`](file:///d:/classroom/classroom-backend/src/index.ts#L6) | **Conflict** | Omitted from draft. Defaults to `8000`. |
| Frontend Environment: `VITE_ACCESS_TOKEN_KEY` & `VITE_REFRESH_TOKEN_KEY` | [`classroom-frontend/src/constants/index.ts:65,66,75,76`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L65) | **Conflict** | Omitted from draft. Enforced by Zod schema validation in frontend constants. |
| Frontend Environment: `VITE_BACKEND_BASE_URL` vs `VITE_API_URL` | [`classroom-frontend/src/constants/index.ts:82,84`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L82) <br> [`classroom-frontend/src/providers/data.ts:136-139`](file:///d:/classroom/classroom-frontend/src/providers/data.ts#L136) | **Verified** | `VITE_BACKEND_BASE_URL` is passed directly into `createDataProvider` in Refine. |
| DB Cascade: Department → Subject (`onDelete: 'restrict'`) | [`classroom-backend/src/db/schema/app.ts:33`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L33) | **Verified** | Prevents department deletion if referencing subjects exist. |
| DB Cascade: Subject → Class (`onDelete: 'cascade'`) | [`classroom-backend/src/db/schema/app.ts:42`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L42) | **Verified** | Deleting a subject automatically deletes dependent classes. |
| Better Auth Mount Point | [`classroom-backend/src/app.ts:49`](file:///d:/classroom/classroom-backend/src/app.ts#L49) | **Verified** | Mounted at `/api/auth/*` via `toNodeHandler(auth)` before `express.json()`. |
| Arcjet Rate Limit Middleware (`securityMiddleWare`) | [`classroom-backend/src/middleware/security.ts:17-78`](file:///d:/classroom/classroom-backend/src/middleware/security.ts#L17) <br> [`classroom-backend/src/app.ts:53`](file:///d:/classroom/classroom-backend/src/app.ts#L53) | **Verified** | Mounted globally. Skips rate limiting in non-production/test environments (`security.ts:18`). |
| Validation Middleware (`validateQuery`, `validateParams`, `validateBody`) | [`classroom-backend/src/middleware/validate.ts:23-81`](file:///d:/classroom/classroom-backend/src/middleware/validate.ts#L23) | **Conflict** | Defined in `validate.ts`, but **never imported or attached** to any route or in `app.ts` (Dead code). |
| Public Unprotected GET Routes | [`classroom-backend/src/routes/*.ts`](file:///d:/classroom/classroom-backend/src/routes/) | **Conflict** | All `GET` routes in all routers lack `requireAuth` protection. |
| Nested Department Routes (`/api/departments/:id/subjects`, etc.) | [`classroom-backend/src/routes/departments.ts`](file:///d:/classroom/classroom-backend/src/routes/departments.ts) | **Not Found** | Draft claimed nested GET routes exist. Route file only contains CRUD on `/api/departments`. |
| Standalone Enrollments Router (`POST /api/enrollments`, `POST /api/enrollments/join`) | [`classroom-backend/src/routes/classes.ts:231,273`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L231) | **Conflict** | Draft claimed standalone `/api/enrollments`. Actual endpoints are `/api/classes/:id/enrollments` & `/api/classes/:id/enrollments/:studentId`. |
| Stats/Overview Endpoints (`GET /api/stats/overview`, `/latest`, `/charts`) | [`classroom-backend/src/routes/dashboard.ts:8`](file:///d:/classroom/classroom-backend/src/routes/dashboard.ts#L8) | **Conflict** | Router is mounted at `/api/dashboard` ([`app.ts:58`](file:///d:/classroom/classroom-backend/src/app.ts#L58)). Route is `GET /api/dashboard/metrics`. |
| Frontend Auth Routes & `authProvider` | [`classroom-frontend/src/App.tsx:56-64,120-162`](file:///d:/classroom/classroom-frontend/src/App.tsx#L56) | **Conflict** | Draft claimed UI login/register flow. `App.tsx` does not pass `authProvider` to Refine nor route login/register components. |

---

## 2. High-Level Overview

The Classroom Management System consists of two services communicating over HTTP:

| Service | Technology Stack | File Location | Entry Point |
|---|---|---|---|
| **Frontend** | React 19, Refine.js (`@refinedev/rest`), Vite, Tailwind CSS | [`classroom-frontend`](file:///d:/classroom/classroom-frontend) | [`src/App.tsx`](file:///d:/classroom/classroom-frontend/src/App.tsx) |
| **Backend** | Express 5, Drizzle ORM, PostgreSQL (Neon), Better Auth, Arcjet | [`classroom-backend`](file:///d:/classroom/classroom-backend) | [`src/index.ts`](file:///d:/classroom/classroom-backend/src/index.ts) / [`src/app.ts`](file:///d:/classroom/classroom-backend/src/app.ts) |

Data model hierarchy: **Department → Subject → Class → Enrollment**.

---

## 3. Prerequisites & Environment Variables

### Required Node & Database
- Node.js 18+ and npm 9+
- PostgreSQL database instance (e.g. Neon connection string)

### Backend Environment Variables (`classroom-backend/.env`)
Verified references in backend source code:

| Variable | Cited Source File & Line | Description |
|---|---|---|
| `DATABASE_URL` | [`src/db/index.ts:5,9`](file:///d:/classroom/classroom-backend/src/db/index.ts#L5), [`drizzle.config.ts:5,14`](file:///d:/classroom/classroom-backend/drizzle.config.ts#L5) | PostgreSQL connection string |
| `FRONTEND_URL` | [`src/app.ts:16,21`](file:///d:/classroom/classroom-backend/src/app.ts#L16), [`src/lib/auth.ts:7`](file:///d:/classroom/classroom-backend/src/lib/auth.ts#L7) | Allowed CORS origin & Better Auth trusted origin |
| `ALLOWED_ORIGINS` | [`src/lib/auth.ts:7`](file:///d:/classroom/classroom-backend/src/lib/auth.ts#L7) | (Optional) Comma-separated list of additional trusted origins |
| `BETTER_AUTH_SECRET` | [`src/lib/auth.ts:16`](file:///d:/classroom/classroom-backend/src/lib/auth.ts#L16) | Secret key for session encryption |
| `BETTER_AUTH_URL` | [`src/lib/auth.ts:15`](file:///d:/classroom/classroom-backend/src/lib/auth.ts#L15) | (Optional) Base URL for auth (defaults to `http://localhost:8000`) |
| `ARCJET_KEY` | [`src/config/arcjet.ts:6`](file:///d:/classroom/classroom-backend/src/config/arcjet.ts#L6) | API key for Arcjet security rate limiting |
| `NODE_ENV` | [`src/app.ts:20`](file:///d:/classroom/classroom-backend/src/app.ts#L20), [`src/middleware/security.ts:18`](file:///d:/classroom/classroom-backend/src/middleware/security.ts#L18) | Environment flag (`development`, `production`, `test`) |
| `PORT` | [`src/index.ts:6`](file:///d:/classroom/classroom-backend/src/index.ts#L6) | (Optional) Server port (defaults to `8000`) |

### Frontend Environment Variables (`classroom-frontend/.env`)
Verified references in [`src/constants/index.ts:60-78`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L60):

| Variable | Cited Source Line | Description |
|---|---|---|
| `VITE_BACKEND_BASE_URL` | [`src/constants/index.ts:63,73,82`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L63) | API base URL passed to Refine data provider (e.g. `http://localhost:8000/api/`) |
| `VITE_API_URL` | [`src/constants/index.ts:64,74,84`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L64) | Base API endpoint URL |
| `VITE_CLOUDINARY_CLOUD_NAME` | [`src/constants/index.ts:62,72,81`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L62) | Cloudinary cloud identifier |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | [`src/constants/index.ts:67,77,89`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L67) | Cloudinary unsigned upload preset |
| `VITE_CLOUDINARY_UPLOAD_URL` | [`src/constants/index.ts:61,71,80`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L61) | Cloudinary HTTP upload endpoint URL |
| `VITE_ACCESS_TOKEN_KEY` | [`src/constants/index.ts:65,75,85`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L65) | Local storage token key identifier |
| `VITE_REFRESH_TOKEN_KEY` | [`src/constants/index.ts:66,76,86`](file:///d:/classroom/classroom-frontend/src/constants/index.ts#L66) | Local storage refresh token key identifier |

---

## 4. Step-by-Step Setup Instructions

### 1. Stand up the backend
```bash
cd classroom-backend
npm install
```
Configure `classroom-backend/.env` with your `DATABASE_URL`, `FRONTEND_URL`, `BETTER_AUTH_SECRET`, and `ARCJET_KEY`. Run database migrations:
```bash
npm run db:generate
npm run db:migrate
npm run dev
```
Health check endpoint: `GET http://localhost:8000/` returns `"Hello, Welcome to the Classroom Backend API!"` ([`src/app.ts:63`](file:///d:/classroom/classroom-backend/src/app.ts#L63)).

### 2. Stand up the frontend
```bash
cd classroom-frontend
npm install
```
Configure `classroom-frontend/.env` with required `VITE_*` keys. Start Vite development server:
```bash
npm run dev
```
Open `http://localhost:5173`.

---

## 5. Data Model (Drizzle ORM Schema)

All application tables are defined in [`classroom-backend/src/db/schema/app.ts`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts) and authentication tables in [`classroom-backend/src/db/schema/auth.ts`](file:///d:/classroom/classroom-backend/src/db/schema/auth.ts).

### Enums
- `roleEnum`: [`auth.ts:4`](file:///d:/classroom/classroom-backend/src/db/schema/auth.ts#L4) — `'student'`, `'teacher'`, `'admin'`
- `classStatusEnum`: [`app.ts:16`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L16) — `'active'`, `'inactive'`, `'archived'`

### Tables & Referential Constraints

```
departments (1) ───< restrict >─── (N) subjects (1) ───< cascade >─── (N) classes (1) ───< cascade >─── (N) enrollments
                                                                              ▲
                                                                              │ <restrict>
                                                                            user (teacher)
```

1. **`departments`**: [`app.ts:23-29`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L23)
   - `id`: `integer` (Primary Key, auto-generated identity)
   - `code`: `varchar(50)` (Not Null, Unique)
   - `name`: `varchar(255)` (Not Null)
   - `description`: `varchar(255)`
   - `createdAt`, `updatedAt`: `timestamp`

2. **`subjects`**: [`app.ts:31-38`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L31)
   - `id`: `integer` (Primary Key, auto-generated identity)
   - `departmentId`: `integer` (Not Null, FK `departments.id`, `onDelete: 'restrict'`)
   - `name`: `varchar(255)` (Not Null)
   - `code`: `varchar(50)` (Not Null, Unique)
   - `description`: `varchar(255)`
   - `createdAt`, `updatedAt`: `timestamp`

3. **`classes`**: [`app.ts:40-56`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L40)
   - `id`: `integer` (Primary Key, auto-generated identity)
   - `subjectId`: `integer` (Not Null, FK `subjects.id`, `onDelete: 'cascade'`)
   - `teacherId`: `text` (Not Null, FK `user.id`, `onDelete: 'restrict'`)
   - `inviteCode`: `text` (Not Null, Unique)
   - `name`: `varchar(255)` (Not Null)
   - `bannerCldPubId`: `text`
   - `bannerUrl`: `text`
   - `description`: `text`
   - `capacity`: `integer` (Default `50`, Not Null)
   - `status`: `classStatusEnum` (Default `'active'`, Not Null)
   - `schedules`: `jsonb` (Default `[]`, Not Null)
   - `createdAt`, `updatedAt`: `timestamp`

4. **`enrollments`**: [`app.ts:58-66`](file:///d:/classroom/classroom-backend/src/db/schema/app.ts#L58)
   - `studentId`: `text` (Not Null, FK `user.id`, `onDelete: 'cascade'`)
   - `classId`: `integer` (Not Null, FK `classes.id`, `onDelete: 'cascade'`)
   - Primary Key: Composite (`studentId`, `classId`)
   - Index / Unique: `enrollments_student_id_class_id_unique`

5. **`user`**: [`auth.ts:11-20`](file:///d:/classroom/classroom-backend/src/db/schema/auth.ts#L11)
   - `id`: `text` (Primary Key)
   - `name`: `text` (Not Null)
   - `email`: `text` (Not Null, Unique)
   - `emailVerified`: `boolean` (Not Null)
   - `image`: `text`
   - `role`: `roleEnum` (Default `'student'`, Not Null)
   - `imageCldPubId`: `text`
   - `createdAt`, `updatedAt`: `timestamp`

6. **`session`**, **`account`**, **`verification`**: [`auth.ts:22-62`](file:///d:/classroom/classroom-backend/src/db/schema/auth.ts#L22)
   - Better Auth internal tables tracking active user sessions, credentials, and verification tokens.

---

## 6. Auth & Security Implementation

### Middleware Pipeline ([`classroom-backend/src/app.ts`](file:///d:/classroom/classroom-backend/src/app.ts))

1. **CORS Middleware**: [`src/app.ts:30-45`](file:///d:/classroom/classroom-backend/src/app.ts#L30)
   - Configured with `credentials: true`. Allows requests from origins listed in `FRONTEND_URL` plus local development ports (`5173`, `3000`).

2. **Better Auth Handler**: [`src/app.ts:49`](file:///d:/classroom/classroom-backend/src/app.ts#L49)
   - Mounted at `/api/auth/*` via `toNodeHandler(auth)` **before** `express.json()`. Uses session cookies.

3. **Arcjet Security & Rate Limiting (`securityMiddleWare`)**:
   - Defined: [`src/middleware/security.ts:17-78`](file:///d:/classroom/classroom-backend/src/middleware/security.ts#L17)
   - Applied: [`src/app.ts:53`](file:///d:/classroom/classroom-backend/src/app.ts#L53)
   - Sliding window limits per minute based on role: `admin` (20/min), `teacher`/`student` (10/min), `guest` (5/min).
   - *Note*: Middleware returns `next()` immediately when `NODE_ENV !== "production"` or in `test` environment ([`security.ts:18`](file:///d:/classroom/classroom-backend/src/middleware/security.ts#L18)).

4. **Role Authorization (`requireAuth`)**:
   - Defined: [`src/middleware/auth.ts:7-30`](file:///d:/classroom/classroom-backend/src/middleware/auth.ts#L7)
   - Extracts session using `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`.
   - Rejects with `401 Unauthorized` if session is missing, or `403 Forbidden` if role is not in `allowedRoles`.

---

## 7. Complete API Reference

All backend route modules are mounted in [`classroom-backend/src/app.ts:57-61`](file:///d:/classroom/classroom-backend/src/app.ts#L57).

### Departments API
Mounted at `/api/departments` ([`src/app.ts:61`](file:///d:/classroom/classroom-backend/src/app.ts#L61)) | Handler: [`src/routes/departments.ts`](file:///d:/classroom/classroom-backend/src/routes/departments.ts)

| Method | Endpoint Path | Handler Line | Auth Protection | Description / Body / Query Params |
|---|---|---|---|---|
| `GET` | `/api/departments` | [`departments.ts:9`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L9) | None (Public) | Paginated list. Query: `search`, `page`, `limit` |
| `POST` | `/api/departments` | [`departments.ts:65`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L65) | `requireAuth(["admin","teacher"])` | Create department. Body: `{ code, name, description }` |
| `GET` | `/api/departments/:id` | [`departments.ts:82`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L82) | None (Public) | Get department details by ID |
| `PATCH` | `/api/departments/:id` | [`departments.ts:96`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L96) | `requireAuth(["admin","teacher"])` | Update department by ID |
| `DELETE` | `/api/departments/:id` | [`departments.ts:115`](file:///d:/classroom/classroom-backend/src/routes/departments.ts#L115) | `requireAuth(["admin"])` | Delete department by ID |

### Subjects API
Mounted at `/api/subjects` ([`src/app.ts:57`](file:///d:/classroom/classroom-backend/src/app.ts#L57)) | Handler: [`src/routes/subjects.ts`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts)

| Method | Endpoint Path | Handler Line | Auth Protection | Description / Body / Query Params |
|---|---|---|---|---|
| `GET` | `/api/subjects` | [`subjects.ts:11`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L11) | None (Public) | Paginated list. Query: `search`, `department`, `page`, `limit` |
| `POST` | `/api/subjects` | [`subjects.ts:81`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L81) | `requireAuth(["admin","teacher"])` | Create subject. Body: `{ code, name, description, departmentId }` |
| `GET` | `/api/subjects/:id` | [`subjects.ts:98`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L98) | None (Public) | Get subject details with department join |
| `PATCH` | `/api/subjects/:id` | [`subjects.ts:116`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L116) | `requireAuth(["admin","teacher"])` | Update subject by ID |
| `DELETE` | `/api/subjects/:id` | [`subjects.ts:135`](file:///d:/classroom/classroom-backend/src/routes/subjects.ts#L135) | `requireAuth(["admin"])` | Delete subject by ID |

### Classes & Enrollments API
Mounted at `/api/classes` ([`src/app.ts:60`](file:///d:/classroom/classroom-backend/src/app.ts#L60)) | Handler: [`src/routes/classes.ts`](file:///d:/classroom/classroom-backend/src/routes/classes.ts)

| Method | Endpoint Path | Handler Line | Auth Protection | Description / Body / Query Params |
|---|---|---|---|---|
| `GET` | `/api/classes` | [`classes.ts:9`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L9) | None (Public) | Paginated list. Query: `search`, `subject`, `teacher`, `page`, `limit` |
| `POST` | `/api/classes` | [`classes.ts:81`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L81) | `requireAuth(["admin","teacher"])` | Create class (generates random 7-char `inviteCode`). Body: `{ name, teacherId, subjectId, capacity, description, status, bannerUrl, bannerCldPubId }` |
| `GET` | `/api/classes/:id/users` | [`classes.ts:104`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L104) | None (Public) | Get enrolled users in class. Query: `search`, `role`, `page`, `limit` |
| `GET` | `/api/classes/:id` | [`classes.ts:180`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L180) | None (Public) | Get class details with subject, department, and teacher joins |
| `PATCH` | `/api/classes/:id` | [`classes.ts:199`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L199) | `requireAuth(["admin","teacher"])` | Update class by ID |
| `DELETE` | `/api/classes/:id` | [`classes.ts:218`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L218) | `requireAuth(["admin"])` | Delete class by ID |
| `POST` | `/api/classes/:id/enrollments` | [`classes.ts:231`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L231) | `requireAuth(["admin","teacher","student"])` | Enroll student in class. Validates `inviteCode` & capacity limit. Body: `{ studentId, inviteCode }` |
| `DELETE` | `/api/classes/:id/enrollments/:studentId` | [`classes.ts:273`](file:///d:/classroom/classroom-backend/src/routes/classes.ts#L273) | `requireAuth(["admin","teacher","student"])` | Remove student enrollment from class |

### Users API
Mounted at `/api/users` ([`src/app.ts:59`](file:///d:/classroom/classroom-backend/src/app.ts#L59)) | Handler: [`src/routes/users.ts`](file:///d:/classroom/classroom-backend/src/routes/users.ts)

| Method | Endpoint Path | Handler Line | Auth Protection | Description / Body / Query Params |
|---|---|---|---|---|
| `GET` | `/api/users` | [`users.ts:11`](file:///d:/classroom/classroom-backend/src/routes/users.ts#L11) | None (Public) | Paginated list. Query: `search`, `role`, `page`, `limit` |
| `POST` | `/api/users` | [`users.ts:77`](file:///d:/classroom/classroom-backend/src/routes/users.ts#L77) | `requireAuth(["admin"])` | Create user manually. Body: `{ name, email, role, image, emailVerified }` |
| `GET` | `/api/users/:id` | [`users.ts:101`](file:///d:/classroom/classroom-backend/src/routes/users.ts#L101) | None (Public) | Get user details by ID |
| `PATCH` | `/api/users/:id` | [`users.ts:115`](file:///d:/classroom/classroom-backend/src/routes/users.ts#L115) | `requireAuth(["admin","teacher"])` | Update user by ID |
| `DELETE` | `/api/users/:id` | [`users.ts:134`](file:///d:/classroom/classroom-backend/src/routes/users.ts#L134) | `requireAuth(["admin"])` | Delete user by ID |

### Dashboard API
Mounted at `/api/dashboard` ([`src/app.ts:58`](file:///d:/classroom/classroom-backend/src/app.ts#L58)) | Handler: [`src/routes/dashboard.ts`](file:///d:/classroom/classroom-backend/src/routes/dashboard.ts)

| Method | Endpoint Path | Handler Line | Auth Protection | Description |
|---|---|---|---|---|
| `GET` | `/api/dashboard/metrics` | [`dashboard.ts:8`](file:///d:/classroom/classroom-backend/src/routes/dashboard.ts#L8) | None (Public) | Returns `{ metrics: { totalUsers, totalClasses, totalDepartments, totalEnrollments }, charts: { userDistribution, classesByDepartment, capacityStatus } }` |

---

## 8. Frontend Refine.js Data Provider Translation

The Refine data provider translates generic UI filtering into backend query parameters in [`classroom-frontend/src/providers/data.ts:48-90`](file:///d:/classroom/classroom-frontend/src/providers/data.ts#L48):

```ts
// Resource Filter Mappings in src/providers/data.ts
- "subjects":
    field "department" => params.department
    field "name" | "code" => params.search
- "classes":
    field "name" => params.search
    field "subject" => params.subject
    field "teacher" => params.teacher
- "users":
    field "role" => params.role
    field "name" | "email" => params.search
```

---

## 9. Known Gaps & Unused Code

1. **Unused Middleware (`src/middleware/validate.ts`)**:
   - `validateQuery`, `validateParams`, and `validateBody` are defined in [`src/middleware/validate.ts`](file:///d:/classroom/classroom-backend/src/middleware/validate.ts#L23) but are **never imported or attached** to any Express route in `src/routes/` or `src/app.ts`.

2. **Unprotected GET Routes**:
   - Every `GET` request across all resources (`/api/departments`, `/api/subjects`, `/api/classes`, `/api/users`, `/api/dashboard/metrics`) lacks `requireAuth` protection and can be accessed publicly without a session cookie.

3. **Frontend Auth Routes & Provider Missing**:
   - In [`classroom-frontend/src/App.tsx:56-64`](file:///d:/classroom/classroom-frontend/src/App.tsx#L56), `<Refine>` is configured without an `authProvider`. Additionally, no `/login` or `/register` routes are registered in the React Router configuration ([`App.tsx:120-162`](file:///d:/classroom/classroom-frontend/src/App.tsx#L120)).

4. **Non-Existent Routes (Draft Discrepancies)**:
   - Standalone `/api/enrollments` or `/api/enrollments/join` routes do not exist; enrollment operations are attached under `/api/classes/:id/enrollments`.
   - `/api/stats/*` routes do not exist; stats metrics are served at `/api/dashboard/metrics`.
   - Nested routes like `GET /api/departments/:id/subjects` or `GET /api/users/:id/departments` do not exist.
