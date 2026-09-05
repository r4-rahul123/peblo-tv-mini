# 🌟 Peblo TV Mini — Streaming Content Management & Viewer Platform

> **Peblo Full-Stack Development Assignment Submission**  
> **Author:** Rahul  
> **Tech Stack:** FastAPI (Python 3.11/3.14) · React TypeScript (Vite + TailwindCSS) · PostgreSQL · Docker & Docker Compose

---

## 🏗️ 1. Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│                      CMS Studio                        │
│               React + Vite (Port 3001)                 │
│    - Role Toggle (Editor vs Admin)                     │
│    - Artwork Validation Engine (2:3, 16:9, <= 200KB)   │
│    - Pre-Publish Blocker Report & Action Guide         │
│    - 1-Click Atomic Rollback & Audit History           │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST
                           ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│                  (Port 8000 / API)                     │
│    - Async SQLAlchemy ORM (PostgreSQL)                 │
│    - Enforced RBAC (403 Forbidden on Publish)          │
│    - Multi-Language content_group Collapsing Engine    │
│    - Season 0 Trailer Separation Logic                 │
│    - Swappable Storage Layer (Local Disk <-> R2)       │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               │ (Atomic 2-Phase Write)   │ (Reads published JSON)
               ▼                          ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│     Storage Backend       │  │       Viewer UI         │
│  (Local Disk / R2 Bucket) │  │ React + Vite (Port 3000) │
│                           │  │  - Netflix-Style Hero   │
│  - catalogue.json         │◄─┤  - Horizontal Carousels │
│  - /artwork/{images}      │  │  - Show Details Modal   │
│  - /runs/{run_id}.json    │  │  - Multi-Profile Switch │
└───────────────────────────┘  │  - Live Composed Search │
                               └─────────────────────────┘
```

### 🩺 Health Endpoint & Production Alerting (Operability)

The backend exposes a dedicated health check and readiness probe at `GET /health` to ensure service operability across the database and storage layers.

- **Endpoint**: `GET /health`
- **What it checks**:
  - **Database Connectivity**: Executes a live `SELECT 1` ping using an asynchronous SQLAlchemy session to verify PostgreSQL connection pool health.
  - **Database Latency**: Measures round-trip query execution time in milliseconds (`latency_ms`).
  - **Catalogue File Presence**: Validates via the active `StorageProvider` (Local Disk or Cloudflare R2) that `catalog/catalogue.json` exists and is accessible.
  - **Overall Status**: Returns `"status": "healthy"` if both the database and catalogue checks pass; otherwise returns `"status": "degraded"`.

```json
// Example GET /health response (200 OK)
{
  "status": "healthy",
  "database": {
    "connected": true,
    "latency_ms": 1.85
  },
  "catalogue": {
    "published": true,
    "path": "catalog/catalogue.json"
  },
  "version": "1.0.0"
}
```

#### Production Alerting Policies
Configure automated alerting (via Prometheus, Datadog, or uptime monitoring) for the following conditions:
1. **Database Connection Failure (`status == "degraded"` or `database.connected == false`)**:
   - **Severity**: Critical (P1)
   - **Trigger**: DB ping fails or times out. Immediate alert as backend cannot query or mutate show metadata.
2. **Missing or Stale Catalogue**:
   - **Missing Catalogue (`catalogue.published == false`)**: Critical (P1). Immediate alert as viewers will receive empty or broken catalogue responses.
   - **Stale Catalogue (> 1 hour since last publish)**: Warning (P2). Triggers if no catalogue publication has occurred within expected refresh schedules.
3. **Database Latency Spike (`database.latency_ms > 500ms`)**:
   - **Severity**: Warning (P2)
   - **Trigger**: Database query response latency exceeds 500ms, indicating connection pool contention, unindexed queries, or database resource saturation.

---

## 🚀 2. Quick Start & How to Run

### Option A: Run with Docker Compose (Single Command)

```bash
# Clone and enter project directory
cd peblo-tv-mini

# Start all services (Postgres, API, CMS UI, Viewer UI)
docker compose up --build -d
```

| Surface | URL | Description |
| :--- | :--- | :--- |
| **Viewer UI** | [http://localhost:3000](http://localhost:3000) | Netflix-style kid-friendly OTT streaming UI |
| **CMS Studio** | [http://localhost:3001](http://localhost:3001) | Content management & publish dashboard |
| **FastAPI Backend** | [http://localhost:8000](http://localhost:8000) | REST API & Interactive Swagger Docs (`/docs`) |
| **PostgreSQL DB** | `localhost:5433` | Database container (`peblo_db`) |

---

### Option B: Running Locally in Development Mode

#### 1. Backend (FastAPI):
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate  |  Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. CMS Studio:
```bash
cd cms-ui
npm install
npm run dev -- --port 3001
```

#### 3. Viewer UI:
```bash
cd viewer-ui
npm install
npm run dev -- --port 3000
```

### ⚙️ Environment Variables Reference (`.env.example`)

The backend and storage services are configured via environment variables. Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

| Variable | Default / Example | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `Peblo TV Mini API` | Human-readable title for FastAPI metadata and OpenAPI documentation. |
| `API_V1_STR` | `/api/v1` | URL routing prefix for all version 1 REST API endpoints. |
| `SECRET_KEY` | `your-secret-key-change-in-production` | Cryptographic secret key used for session signing and auth token integrity. |
| `ALGORITHM` | `HS256` | JWT encoding algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Expiration window in minutes for access tokens (defaults to 24h). |
| `DATABASE_URL` | `sqlite+aiosqlite:///./peblo.db` | Async SQLAlchemy database connection string (SQLite for local dev; `postgresql+asyncpg://<user>:<password>@<host>:5432/<dbname>` for production/Docker). |
| `STORAGE_BACKEND` | `local` | Storage provider strategy to use: `local` (filesystem storage) or `r2` (Cloudflare R2 / S3-compatible object storage). |
| `LOCAL_STORAGE_DIR` | `./storage` | Filesystem directory used for storing published catalogues and uploaded artwork when `STORAGE_BACKEND=local`. |
| `R2_ACCOUNT_ID` | `your-cloudflare-account-id` | Cloudflare R2 Account ID (used to construct S3 endpoint URL). |
| `R2_ACCESS_KEY_ID` | `your-r2-access-key-id` | Cloudflare R2 / AWS S3 access key ID credential. |
| `R2_SECRET_ACCESS_KEY` | `your-r2-secret-access-key` | Cloudflare R2 / AWS S3 secret access key credential. |
| `R2_BUCKET_NAME` | `peblo-tv-mini-catalogue` | Name of the bucket storing catalogue JSON payloads and uploaded artwork assets. |
| `R2_PUBLIC_URL` | `https://cdn.peblo.tv` | Public CDN domain or URL base for serving published catalogue JSON and media files directly. |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:3000","http://localhost:3001"]` | JSON list of allowed origins permitted to make cross-origin requests to the FastAPI backend. |

---

## 🧪 3. Automated Test Suite

I wrote 10 comprehensive tests covering the riskiest parts of the pipeline:

```bash
cd backend
pytest -v
```

### What is tested:
- ✅ **Artwork Validation (`test_artwork.py`)**: Aspect ratio enforcement (2:3 for poster, 16:9 for banner/thumbnail), dimension checks ($\ge 300\text{px}$), and $200\text{ KB}$ ceiling limits.
- ✅ **Atomic Publisher (`test_publisher.py`)**: Multi-language `content_group` collapsing (`available_languages: ["en", "hi"]`) and Season 0 trailer extraction.
- ✅ **RBAC Security (`test_rbac.py`)**: Enforces that Editors receive `403 Forbidden` on publish while Admins succeed.
- ✅ **Composed Search (`test_search.py`)**: Multi-field querying across titles, synopsis, categories, and languages.

---

## 📝 4. Part E: Decisions, Trade-offs & Deep Dive

### 1. How I Made Publishing Atomic (& What Happens on Mid-Publish Crashes)
To guarantee that a viewer never reads a half-written or corrupt catalogue, I used a **Two-Phase Atomic Commit** pattern:
- The backend compiles and validates the entire catalogue payload in memory first.
- **On Local Storage**: It writes the payload to a temporary file (`catalogue.json.tmp.<uuid>`), flushes it to disk with `os.fsync()`, and replaces `catalogue.json` in a single `os.replace()` call. On POSIX and modern Windows filesystems, `os.replace` is atomic at the filesystem inode level. If the process dies mid-write, the existing `catalogue.json` remains completely intact and valid.
- **On Cloudflare R2 / S3**: Object PUTs are atomic single HTTP requests. A reader either fetches the prior version or the new version; partial objects do not exist.
- **Rollback Snapshotting**: Every publish also archives an immutable copy at `catalog/runs/{run_id}.json`. If an editor needs to revert, the 1-click rollback endpoint swaps that snapshot back instantly.

### 2. Storage Abstraction (Local Disk $\leftrightarrow$ Cloudflare R2)
I implemented an abstract `StorageProvider` base class (`backend/app/services/storage/base.py`) with standard async primitives (`read_file`, `atomic_write`, `save_file`, `get_url`).
- Switching from local storage to Cloudflare R2 requires **zero code changes** — simply change one environment variable:
  ```env
  STORAGE_BACKEND=r2
  ```
  Neither the FastAPI routes nor the React frontends have any storage-specific branch conditions.

### 3. Search: Implementation & Scaling to 100,000+ Shows
- **Current Setup**: At Peblo's current catalogue size (< 500 shows), client-side filtering over the published JSON provides instant sub-10ms results with zero server latency.
- **Scaling Limit**: Around 5,000–10,000 shows, downloading a multi-megabyte JSON file hurts mobile network performance.
- **Next Evolution Step**:
  1. Move search to a dedicated backend engine (**Meilisearch** or **PostgreSQL `tsvector` with GIN indexes and `pg_trgm` fuzzy matching** for typo tolerance).
  2. Implement **Section Sharding** (e.g. `sections/top-picks.json`) with edge caching via Cloudflare CDN and on-demand pagination.

### 4. Why Serve a Pre-Published Static File vs. Per-Request Database Queries?
- **Peak Traffic Resilience**: During morning and bedtime rushes when thousands of kids open Peblo TV simultaneously, static files served from CDN edge POPs take **0 database connections**.
- **Ultra-low Latency**: ~15ms response times worldwide.
- **Where this choice bites**: Edits made in CMS do not show up immediately in the viewer app until an Admin clicks "Publish Catalogue" (introducing a 1–2 second publish cycle). For curated OTT streaming, this is a very worthwhile trade-off.

### 5. What I Left Out & AI Disclosure
- **AI Tools Used**: I used Google Antigravity / Gemini for rapid boilerplate scaffolding, Pydantic V2 schema validations, and drafting test fixtures.
  - **Where AI output was ACCEPTED**: AI assistance was accepted for rapid generation of Pydantic schema boilerplate, comprehensive test fixture scaffolding, and initial Tailwind CSS component layouts across the Viewer and CMS frontends.
  - **Where AI output was REJECTED**: AI suggestions were rejected whenever system correctness, durability, or domain precision were required. Specifically, AI suggested synchronous file I/O for catalogue persistence, which was rejected in favor of an atomic tempfile + `fsync` + `os.replace` rename pattern to prevent corruption during mid-publish process failures; furthermore, AI generated naive string-matching age filters, which were rejected and replaced with numeric range overlap arithmetic to ensure accurate age-appropriate catalog filtering.
- **Scoping Decisions**:
  1. **Video Streaming Pipeline**: I focused on realistic metadata, thumbnails, durations, and language switching rather than building a heavy HLS/DASH video transcoder.
  2. **1-Click RBAC Role Switcher**: Built into the CMS header (`Editor` ↔ `Admin`) for smooth evaluator DX so reviewers can test permissions in seconds without logging in and out, backed by strict server-side 403 enforcement.

---

## ⏱️ 5. Time Spent Breakdown

| Component / Task | Focus Areas | Approximate Time Spent |
| :--- | :--- | :--- |
| **Part A: Backend & Schema Architecture** | Async SQLAlchemy ORM, PostgreSQL connection, Seed data loader, Shows/Seasons/Episodes REST APIs | ~3.0 Hours |
| **Part B: Validation Engine & RBAC** | Aspect ratio (2:3, 16:9) & 200KB validator, Pre-publish blocker logic, 403 Forbidden enforcement | ~2.5 Hours |
| **Part C: Atomic Publisher & Storage** | Two-phase atomic write, `content_group` multi-language collapsing, Season 0 trailer separation, R2/Local abstraction | ~3.0 Hours |
| **Part D: Frontend Apps (Viewer UI & CMS)** | Netflix-style OTT streaming interface (Port 3000), Multi-Profile system, CMS Studio & Publish Dashboard (Port 3001) | ~4.5 Hours |
| **Part E: Testing, Docker & Documentation** | Pytest test suite (10/10 passing), Docker Compose multi-container setup, Part E architectural write-up | ~2.0 Hours |
| **Total Development Time** | **End-to-end full stack platform** | **~15 Hours** |
