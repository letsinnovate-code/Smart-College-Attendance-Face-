# System Architecture & Design Specification

## 1. Overview & High-Level Architecture

The Smart College Attendance Backend is designed as a **modular monolith** with clean bounded contexts, strict multi-tenant isolation, and a pluggable biometric adapter layer.

```
                           +------------------------+
                           |  Client Applications   |
                           |  (Mobile & Web Portal) |
                           +-----------+------------+
                                       | HTTPS
                                       v
                     +------------------------------------+
                     |  Reverse Proxy / Ingress (Nginx)   |
                     +-----------------+------------------+
                                       |
                                       v
               +------------------------------------------------+
               |         Express.js Modular Monolith            |
               |                                                |
               |  +------------------------------------------+  |
               |  |  Security & Middleware Pipeline          |  |
               |  |  - Helmet, CORS, Request ID (UUID)       |  |
               |  |  - Authenticate (jose JWT HS256)         |  |
               |  |  - Role & Tenant Scoping Context         |  |
               |  |  - Distributed Rate Limiter              |  |
               |  +--------------------+---------------------+  |
               |                       |                        |
               |  +--------------------+---------------------+  |
               |  |  Service Domain Controllers              |  |
               |  |  - Auth & Refresh Session Lifecycle      |  |
               |  |  - Multi-College Tenant Engine           |  |
               |  |  - Academic Structure (Depts, Classes)   |  |
               |  |  - Attendance Session State Machine      |  |
               |  |  - Audit & Anti-Tampering Engine         |  |
               |  |  - Safe Formula-Injection Free CSV Gen  |  |
               |  +--------------------+---------------------+  |
               |                       |                        |
               |  +--------------------+---------------------+  |
               |  |  Biometric Face Provider Adapter Layer   |  |
               |  |  - Abstract Provider Interface           |  |
               |  |  - OnnxFaceProvider (Local ArcFace)      |  |
               |  |  - HttpFaceProvider (Python Sidecar)     |  |
               |  |  - MockFaceProvider (Strict Dev/Test)    |  |
               |  +--------------------+---------------------+  |
               +-----------+----------------------+-------------+
                           |                      |
            MongoDB Wire   |                      | mTLS / REST
                           v                      v
             +--------------------+   +------------------------+
             |   MongoDB 7.0+     |   | Python FastAPI Sidecar |
             |   (Replica Set)    |   | (InsightFace / GPU)    |
             +--------------------+   +------------------------+
                           |
                           v
             +--------------------+
             |   Redis 7.2 Cache  |
             |   (Rate Limit/Q)   |
             +--------------------+
```

---

## 2. Multi-Tenancy Architecture

1. **Discriminator Column Multi-Tenancy**:
   - Every collection (except `College` and global `superAdmin` accounts) contains a required, indexed `collegeId`.
   - Never trusts client-supplied query or body tenant parameters.
   - The `attachTenantContext` middleware inspects the verified JWT subject, validates tenant status against the active college record, and binds `req.tenantId`.
   - Service layers enforce `scopeQueryToTenant` to guarantee data isolation.

2. **Cross-Tenant Guardrails**:
   - `requireCollegeScope` middleware prevents users from college A from reading or modifying records belonging to college B.
   - SuperAdmins bypass tenant locks exclusively for system orchestration.

---

## 3. Biometric Pipeline & Data Privacy

1. **Consent & Verification Workflow**:
   - Biometric enrollment is two-step:
     1. `POST /api/v1/face/students/:id/face-enrollment`: Issues an expiring, cryptographically signed nonce challenge.
     2. `POST /api/v1/face/students/:id/face-enrollment/confirm`: Receives the selfie + challenge + explicit consent boolean.
   - Quality filters discard blurred, occluded, or non-frontal submissions.
2. **Encryption At Rest**:
   - Face embeddings (512-dimensional floating-point vectors) are encrypted using authenticated **AES-256-GCM** with random 96-bit initialization vectors (IVs) and authentication tags.
   - Raw face images are held **strictly in-memory** during inference and wiped immediately from RAM. No raw biometric imagery is ever written to disk or database.
3. **Revocation & Right-to-be-Forgotten**:
   - Immediate cryptographic erasure via `DELETE /api/v1/face/students/:id/face-template`.

---

## 4. Attendance Session State Machine

Sessions follow a strict finite state lifecycle:

```
[ draft ] ---------> [ open ] ---------> [ closed ]
    |                   |
    +-----> [ cancelled ] <-----+
```

- **Challenge Issuance**: To combat replay attacks and pre-recorded camera feeds, a student must query `POST /api/v1/attendance/sessions/:id/challenge` to obtain a fresh 60-second time-bound token.
- **Atomic Upsert**: Verified submissions use compound unique indices `{ collegeId, sessionId, studentId }` to ensure zero possibility of duplicate attendance records under high concurrency.
