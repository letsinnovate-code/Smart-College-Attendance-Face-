# Operations & Production Runbook

## 1. Quick Start (Local Development)

### Prerequisites
- Node.js >= 20 LTS
- MongoDB running locally or via Docker
- Optional: Redis running locally

### Setup Steps
```bash
# 1. Install dependencies
npm ci

# 2. Copy environment file
cp .env.example .env

# 3. Synchronize database indexes
npm run db:indexes

# 4. Seed initial database records
npm run db:seed

# 5. Start dev server with file watcher
npm run dev
```

Visit Swagger API Docs at: `http://localhost:3000/api/docs`.

---

## 2. Docker Deployment

### Start with Docker Compose
```bash
docker compose up -d --build
```

### Inspect logs
```bash
docker compose logs -f backend
```

---

## 3. Database Management & Index Synchronization
Indexes should be applied before starting production application traffic:
```bash
npm run db:indexes
```

---

## 4. Test Suite Execution
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Security tests only
npm run test:security

# Concurrency tests only
npm run test:concurrency
```

---

## 5. Troubleshooting & Health Probes

- **Liveness Probe**: `GET /api/v1/health/live` returns HTTP 200 if the Node.js process event loop is alive.
- **Readiness Probe**: `GET /api/v1/health/ready` validates MongoDB connection state and Face Provider availability before receiving cluster traffic.
- **Biometric Error Resolution**:
  - `NO_FACE_DETECTED`: Check lighting and frontal face orientation.
  - `MULTIPLE_FACES_DETECTED`: Ensure only one individual appears in the frame.
  - `LIVENESS_FAILED`: Suspected spoofing or static image presentation.
