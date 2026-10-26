# Python Face Recognition Sidecar Specification

## 1. Role & Purpose

The Node.js backend operates with an abstract biometric interface (`FaceProviderInterface`).
In production high-throughput clusters with NVIDIA GPUs, biometric inference is offloaded to a dedicated Python sidecar (FastAPI + InsightFace / ArcFace + Silent-Face-Anti-Spoofing).

```
[ Express Backend ] ---- HTTP / mTLS POST ----> [ Python Face Sidecar ]
                                                  - GPU CUDA Acceleration
                                                  - InsightFace Buffalo_l
                                                  - MiniFASNet Liveness
```

---

## 2. API Contract

The Python service must implement the following endpoints conforming to `HttpFaceProvider.js`:

### 1. Health Probe
- `GET /health`
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "gpu_available": true,
  "device": "cuda:0",
  "model_version": "arcface-r100",
  "liveness_supported": true
}
```

### 2. Extract Embedding
- `POST /api/v1/face/embed`
- **Request**: `multipart/form-data` with field `image` (binary JPEG/PNG/WebP).
- **Header**: `X-Sidecar-Key: <shared_secret>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "embedding": [0.0412, -0.0891, ...], // 512-dim float array
  "quality_score": 0.94,
  "confidence": 0.98,
  "bounding_box": [120, 80, 240, 260]
}
```

### 3. Verify Biometric Face
- `POST /api/v1/face/verify`
- **Request**: `multipart/form-data`:
  - `image`: binary file
  - `enrolled_embedding`: JSON-encoded 512-float array
  - `threshold`: float (e.g. `0.60`)
- **Response `200 OK`**:
```json
{
  "is_match": true,
  "similarity": 0.84,
  "liveness": {
    "is_live": true,
    "confidence": 0.96
  }
}
```

---

## 3. Recommended Python Technology Stack
- **FastAPI** + **Uvicorn**
- **InsightFace** (`buffalo_l` or `antelopev2` models)
- **ONNX Runtime GPU** or **PyTorch CUDA 12**
- **OpenCV-Python-Headless**
