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
