# Application Security & Threat Model

## 1. Authentication & Session Security

- **Password Storage**: Hashed using **Argon2id** (OWASP recommended: 64 MB memory cost, 3 iterations, 4 parallelism threads). Defends against GPU and ASIC cracking attacks.
- **Timing Attack Mitigation**: Dummy password hashes are executed when non-existent usernames/emails are supplied to prevent account enumeration via timing discrepancies.
- **Short-Lived Access Tokens**: Signed using `jose` with explicit `HS256`, 15-minute expiration, audience (`smart-attendance-api`), and issuer (`smart-attendance`).
- **Rotating Refresh Tokens**:
  - Refresh tokens are delivered via `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
  - Stored in the database as SHA-256 digests (`tokenHash`).
  - **Reuse Detection**: Each session stores `parentTokenHash`. If an already-rotated token is presented (indicating token theft), the entire session family for that user is immediately revoked.
- **Brute Force Lockout**: Progressive rate limiting and temporary account lockout (15 minutes) after 5 consecutive failed login attempts.

---

## 2. Authorization & Tenant Isolation (OWASP Top 10)

- **Broken Object Level Authorization (BOLA / IDOR)**:
  - Users are strictly bound to their college tenant. All queries enforce `{ collegeId: req.tenantId }`.
  - Sensitive operations check `requireSelf('id')` to ensure students/faculty can only query or alter their own biometric or personal records.
- **Privilege Escalation**:
  - Role hierarchy checks prevent `collegeAdmin` from elevating users to `superAdmin` or creating colleges.
- **Formula Injection (CSV Injection)**:
  - All spreadsheet export strings starting with `=`, `+`, `-`, `@`, `\t`, `\r` are neutralized with prepended apostrophes (`'`).

---

## 3. Biometric Threat Mitigation

| Threat Vector | Defense Mechanism |
|---|---|
| **Replay Attacks** | Time-limited (60-second) cryptographically signed session nonces required on every biometric post. |
| **Photo / Screen Presentation Attacks** | Liveness verification threshold check enforced via the face provider pipeline before embedding extraction. |
| **Biometric Database Compromise** | Embeddings stored as AES-256-GCM ciphertexts. Decryption key stored outside the database in secure environment variables. |
| **Data Retention / Regulatory Breach** | Students can self-revoke their biometric template at any time (`DELETE /face-template`). Raw images are never stored on disk. |

---

## 4. Immutable Audit Trail

- The `AuditLog` collection overrides Mongoose update primitives (`updateOne`, `updateMany`, `findOneAndUpdate`) to throw runtime exceptions.
- Expired audit logs are deleted exclusively via automated MongoDB TTL indexes (365 days retention).
