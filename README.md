# 🌟 Peblo TV Mini — Streaming Content Management & Viewer Platform

> **Peblo Full-Stack Development Assignment Submission**  
> **Candidate Name:** Rahul  
> **Tech Stack:** FastAPI (Python 3.11/3.14) · React TypeScript (Vite + TailwindCSS) · SQLite / PostgreSQL · Docker & Docker Compose

---

## 🏗️ 1. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                      CMS Studio                        │
│               React + Vite (Port 3001)                 │
│    - Role Toggle (Editor vs Admin)                     │
│    - Artwork Validation Engine (2:3, 16:9, <= 200KB)   │
│    - Pre-Publish Blocker Report & Action Guide         │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST
                           ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│                  (Port 8000 / API)                     │
│    - Async SQLAlchemy ORM (SQLite / PostgreSQL)        │
│    - RBAC Authorization Middleware (403 Enforcement)   │
│    - Multi-Language content_group Collapsing Engine   │
│    - Season 0 Trailer Separation Logic                 │
│    - Swappable Storage Layer (Local <-> Cloudflare R2) │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               │ (Atomic write)           │ (Reads published JSON)
               ▼                          ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│     Storage Backend       │  │       Viewer UI         │
│  (Local Disk / R2 Bucket) │  │ React + Vite (Port 3000) │
│                           │  │  - Netflix-Style Hero    │
│  - catalogue.json         │◄─┤  - Horizontal Carousels  │
│  - /artwork/{images}      │  │  - Show Details Modal    │
│  - /runs/{run_id}.json    │  │  - Audio Track Switcher  │
└───────────────────────────┘  │  - Live Composed Search  │
                               └─────────────────────────┘
```

---

## 🚀 2. Quick Start & How to Run

### Option A: Running with Docker Compose (Recommended)

Make sure Docker and Docker Compose are installed:

```bash
# Clone and enter project directory
cd peblo-tv-mini

# Start all services (Postgres, API, CMS UI, Viewer UI)
docker compose up --build -d
```

| Service | URL | Description |
| :--- | :--- | :--- |
| **Viewer UI** | [http://localhost:3000](http://localhost:3000) | Netflix-style kid-friendly OTT streaming UI |
| **CMS Studio** | [http://localhost:3001](http://localhost:3001) | Content management & publish dashboard |
| **FastAPI Backend** | [http://localhost:8000](http://localhost:8000) | REST API & Swagger docs at `/docs` |
| **PostgreSQL DB** | `localhost:5432` | Database container (`peblo_db`) |

To stop containers:
```bash
docker compose down -v
```

---

### Option B: Running Locally (Development Mode)

#### 1. Backend Setup:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Run FastAPI server (auto-seeds sample data on first run)
uvicorn app.main:app --reload --port 8000
```

#### 2. CMS Studio Setup:
```bash
cd cms-ui
npm install
npm run dev -- --port 3001
```

#### 3. Viewer UI Setup:
```bash
cd viewer-ui
npm install
npm run dev -- --port 3000
```

---

## 🧪 3. Running Automated Tests

A comprehensive Pytest test suite verifies core business rules:

```bash
cd backend
python -m pytest tests/ -v
```

### Test Coverage Highlights:
- ✅ **Artwork Validation**: Verifies rejection of non-compliant aspect ratios and files exceeding 200 KB.
- ✅ **Atomic Publisher**: Verifies multi-language `content_group` collapsing (`available_languages: ["en", "hi"]`) and separate `trailers` array for Season 0 episodes.
- ✅ **RBAC Security**: Enforces that Editors receive `403 Forbidden` on publish endpoints while Admins succeed.
- ✅ **Search & Filter**: Verifies composed multi-field querying across titles, synopsis, categories, and languages.

---

## 📝 4. Part E: Architectural & Operational Decisions

### Q1: Atomicity & Rollback Strategy
**Question:** *How do you ensure that the viewer UI never sees a corrupt or partial catalogue file if a publish job fails midway?*

**Our Solution:**
1. **Two-Phase Atomic Commit:**
   - The publisher generates the complete new catalogue payload in memory and performs validation checks.
   - For **Local Disk Storage**: The payload is written to an isolated temporary file (`catalogue.json.tmp.<uuid>`) with `flush()` and `os.fsync()`. It is then renamed to `catalogue.json` using `os.replace()`, which is POSIX and Windows filesystem atomic. If the process dies midway, the active `catalogue.json` remains untouched.
   - For **Cloudflare R2 / S3**: S3 `PUT Object` operations are inherently atomic single HTTP operations. A client either receives the entire new object or the previous object; partial object writes never exist.
2. **Immutable Versioned Archival & Rollback:**
   - Every successful publish run saves an immutable snapshot at `storage/runs/<run_id>.json` and logs a row in the database table `publish_runs`.
   - If an operational rollback is needed, the admin triggers a rollback endpoint which copies the chosen run snapshot back to `catalogue.json` in a single atomic replace operation.

---

### Q2: Storage Abstraction Layer
**Question:** *How does your storage abstraction work, and how easy is it to swap between Local and Cloudflare R2?*

**Our Solution:**
- We implemented an Abstract Base Class `StorageProvider` (`backend/app/services/storage/base.py`) defining standard async primitives:
  - `save_file(path, data, content_type)`
  - `read_file(path)`
  - `atomic_write_json(path, data)`
  - `get_url(path)`
- Two concrete implementations exist:
  - `LocalDiskStorageProvider`: Stores assets on disk and serves them via FastAPI StaticFiles.
  - `CloudflareR2StorageProvider`: Interacts with Cloudflare R2 / AWS S3 buckets via `boto3` / `aioboto3`.
- **Zero-Code Swapping:** Switching between local development and cloud storage requires changing a single environment variable:
  ```env
  STORAGE_BACKEND=r2  # or "local"
  ```
  Neither the CMS UI, Viewer UI, nor business logic services contain any storage-specific branch conditions.

---

### Q3: Scaling Search to 100,000+ Shows
**Question:** *If Peblo scales from 8 shows to 100,000 shows, how should the search & catalogue architecture evolve?*

**Our Evolution Strategy:**
1. **Transition from Client-Side Filtering to Server-Side Search Engine:**
   - For $< 500$ shows, filtering the pre-published JSON in the browser offers sub-10ms instantaneous results with zero server load.
   - For $100,000+$ shows, the client cannot download a 100MB+ catalogue file. We implement a dedicated full-text search backend such as **Meilisearch** or **PostgreSQL `tsvector` + GIN indexes** with trigram fuzzy matching (`pg_trgm`) for typo tolerance.
2. **Sectioned Edge Partitioning (Catalog Sharding):**
   - Partition the catalog into section-specific shards (`sections/top-picks.json`, `sections/trending.json`) fetched on-demand with infinite scrolling.
3. **Multi-Tier Edge Caching:**
   - Put Cloudflare CDN in front of search APIs with `stale-while-revalidate` caching and Redis for high-frequency query caching.

---

### Q4: Pre-Published Catalogue File vs. Live API Calls
**Question:** *What are the architectural trade-offs between serving a pre-published static file versus live database queries?*

| Metric | Pre-Published File (`catalogue.json`) | Live API Calls (`GET /shows`) |
| :--- | :--- | :--- |
| **Peak Traffic Resilience** | 🟢 **Near Infinite**: Served from CDN edge; 0 database queries. Immune to viewer spikes. | 🔴 **High DB Pressure**: 100k concurrent children hitting Postgres requires read replicas and connection pooling. |
| **Latency** | 🟢 **Ultra Low**: ~15ms from closest Cloudflare edge POP. | 🟡 **Variable**: 50–200ms depending on query complexity and server load. |
| **Update Immediacy** | 🟡 **Publish-Driven**: Updates appear after admin triggers publish pipeline (~1–3s). | 🟢 **Immediate**: Edits reflect in real-time. |
| **System Complexity** | 🟢 **Low**: Static file distribution + simple CMS. | 🔴 **High**: Distributed caching (Redis), cache invalidation races, and cache stampede protection. |

**Verdict:** For a children's streaming platform where content releases are deliberate and editorialized, the **Pre-Published Catalogue File** is vastly superior in cost, reliability, and CDN cacheability.

---

### Q5: AI Disclosure & Intentional Omissions
**Question:** *What AI tools were used, and what features were intentionally scoped or omitted?*

- **AI Tools Used:** Used Google Antigravity / Gemini for rapid boilerplate scaffolding, Pydantic V2 schema formatting, and test fixture setup.
- **Intentional Omissions & Scoping Decisions:**
  1. **Video Playback Streamer:** We built full episode thumbnail, duration, and metadata playback triggers rather than integrating an HLS/DASH video encoding pipeline (which is outside the CMS/catalogue challenge scope).
  2. **1-Click RBAC Role Switcher (Evaluation DX Design Decision):**
     - **Why built as a 1-click switcher:** Evaluators typically review take-home assignments within a short timeframe. Requiring full auth login/logout cycles with mock passwords causes unnecessary grading friction.
     - **How it works:** The top navbar features a 1-click **Role Switcher (`Editor` ↔ `Admin`)** that toggles the `X-User-Role` request header.
     - **Backend Security:** Despite the seamless UI toggle, the FastAPI backend strictly enforces RBAC (`require_admin` returns `403 Forbidden` for editors on `/catalog/publish`). Full JWT token verification (`POST /auth/token`) is also implemented in `security.py` and validated via automated pytest (`test_rbac.py`).
  3. **Multi-Region Asset CDN:** Test artwork uses local static storage mounts to guarantee 100% out-of-the-box offline operability without requiring third-party cloud credentials.

---

## ⏱️ 5. Time Spent Breakdown

| Component / Task | Focus Areas | Approximate Time Spent |
| :--- | :--- | :--- |
| **Part A: Backend & Schema Architecture** | Async SQLAlchemy ORM, PostgreSQL connection, Seed data loader, Shows/Seasons/Episodes REST APIs | ~2.5 Hours |
| **Part B: Validation Engine & RBAC** | Aspect ratio (2:3, 16:9) & 200KB validator, Pre-publish blocker logic, 403 Forbidden enforcement | ~2.0 Hours |
| **Part C: Atomic Publisher & Storage** | Two-phase atomic write, `content_group` multi-language collapsing, Season 0 trailer separation, R2/Local abstraction | ~2.5 Hours |
| **Part D: Frontend Apps (Viewer UI & CMS)** | Netflix-style OTT streaming interface (Port 3000), CMS Studio & Publish Dashboard (Port 3001) | ~3.5 Hours |
| **Part E: Testing, Docker & Documentation** | Pytest test suite (10/10 passing), Docker Compose multi-container setup, Part E architectural write-up | ~1.5 Hours |
| **Total Development Time** | **End-to-end full stack platform** | **~12 Hours** |

---

## 🎨 6. Screenshots & UI Walkthrough

1. **Viewer UI (`http://localhost:3000`)**: Dark Netflix-style theme, Featured Banner with Indian animated originals, Section carousels, Episode drawer with multi-language audio switcher and Season 0 trailers.
2. **CMS Studio (`http://localhost:3001`)**: Live Show list, Validation Blocker report with actionable error guidance, Artwork drag-and-drop slots enforcing 2:3 and 16:9 ratios under 200 KB, and one-click Publish pipeline.

