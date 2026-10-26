# REST API Reference & Specification

All routes are mounted under `/api/v1`.
Interactive Swagger UI is available at `/api/docs` and OpenAPI JSON schema at `/api/docs.json`.

---

## 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticates credentials; returns JWT; sets refresh cookie. |
| `POST` | `/auth/refresh` | Public | Rotates refresh token; returns new access token. |
| `POST` | `/auth/logout` | Authenticated | Revokes current refresh token. |
| `POST` | `/auth/logout-all` | Authenticated | Revokes all active refresh sessions for current user. |
| `POST` | `/auth/forgot-password` | Public | Issues password reset token (generic response). |
| `POST` | `/auth/reset-password` | Public | Resets password with valid token. |
| `GET` | `/auth/me` | Authenticated | Returns authenticated user profile and roles. |

---

## 2. Colleges & Tenants (`/api/v1/colleges`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/colleges` | SuperAdmin | Registers a new college tenant. |
| `GET` | `/colleges` | SuperAdmin | Paginated list of registered colleges. |
| `GET` | `/colleges/:id` | SuperAdmin / CollegeAdmin | College details and settings. |
| `PUT` | `/colleges/:id` | SuperAdmin / CollegeAdmin | Updates college details or settings. |
| `PATCH` | `/colleges/:id/status` | SuperAdmin | Activates, suspends, or flags college. |

---

## 3. Academic Structure (`/api/v1/academic`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/academic/departments` | CollegeAdmin | Creates a department. |
| `GET` | `/academic/departments` | Faculty+ | Lists college departments. |
| `POST` | `/academic/courses` | CollegeAdmin | Creates a degree course. |
| `GET` | `/academic/courses` | Faculty+ | Lists degree courses. |
| `POST` | `/academic/classes` | CollegeAdmin | Creates an academic class/section. |
| `GET` | `/academic/classes` | Faculty+ | Lists classes. |
| `POST` | `/academic/subjects` | CollegeAdmin | Creates a subject curriculum entry. |
| `GET` | `/academic/subjects` | Faculty+ | Lists subjects. |
| `POST` | `/academic/faculty-assignments` | CollegeAdmin | Assigns a faculty member to class & subject. |
| `GET` | `/academic/faculty-assignments` | Faculty+ | Lists faculty teaching assignments. |
| `POST` | `/academic/student-enrollments` | CollegeAdmin | Enrolls a student in a class. |
| `GET` | `/academic/student-enrollments` | Faculty+ | Lists student class enrollments. |

---

## 4. Attendance Operations (`/api/v1/attendance`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/attendance/sessions` | Faculty+ | Schedules an attendance session. |
| `GET` | `/attendance/sessions` | Faculty+ | Lists sessions with filters. |
| `PATCH` | `/attendance/sessions/:id/open` | Faculty+ | Opens attendance window for submissions. |
| `PATCH` | `/attendance/sessions/:id/close` | Faculty+ | Closes session. |
| `POST` | `/attendance/sessions/:id/challenge` | Student | Issues single-use 60s nonce for attendance. |
| `POST` | `/attendance/sessions/:id/verify` | Student | Submits face + nonce for attendance marking. |
| `GET` | `/attendance/sessions/:id/records` | Faculty+ | Inspects attendance roster for a session. |
| `POST` | `/attendance/corrections` | Student/Faculty | Requests attendance correction. |
| `PATCH` | `/attendance/corrections/:id/review` | Faculty+ | Approves or rejects correction. |

---

## 5. Biometrics & Face Management (`/api/v1/face`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/face/students/:id/face-enrollment` | Self / Admin | Issues enrollment challenge token. |
| `POST` | `/face/students/:id/face-enrollment/confirm` | Self | Submits face selfie + consent to store template. |
| `DELETE` | `/face/students/:id/face-template` | Self / Admin | Revokes and deletes biometric template. |
| `GET` | `/face/students/:id/face-enrollment/status` | Self / Admin | Returns whether student has active enrollment. |

---

## 6. Reports & Audit Logs

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/reports/overview` | Faculty+ | Daily attendance dashboard summary. |
| `GET` | `/reports/classes/:classId` | Faculty+ | Class attendance percentage breakdown. |
| `GET` | `/reports/classes/:classId/export/csv` | Faculty+ | Downloads sanitized CSV attendance report. |
| `GET` | `/reports/students/:studentId` | Student/Faculty | Student-specific attendance history. |
| `GET` | `/audit` | Auditor / Admin | Paginated immutable audit trail. |
