# Warehouse Asset Register

A small full-stack prototype for logging warehouse assets: an operator enters an
**Asset ID**, **Category** and **Photograph**; the server stamps the date/time and stores
everything in a database. All records show in a responsive dashboard with search by Asset ID.

| Layer     | Technology                         |
|-----------|------------------------------------|
| Frontend  | React 18 + Vite (plain CSS)        |
| Backend   | Python Flask, REST API             |
| Database  | SQLite (single file, no setup)     |
| Images    | Stored on disk, filename in the DB |

## Features

- Entry form with live photo preview (works with the phone camera)
- Server-side automatic timestamp (UTC, shown in the viewer's local time)
- Dashboard with card grid, pagination, category filter
- Search by Asset ID (partial match, e.g. `plt` finds `PLT-00417`)
- Record view with full-size photo; deep links like `/#/asset/5`
- Delete record (also removes the photo file)
- Responsive: sidebar on desktop, bottom tab bar on phones
- Duplicate Asset IDs rejected (HTTP 409); photos verified by file signature, 8 MB limit
- **Automation-ready** `POST /api/ingest` endpoint (see below)

## Project structure

```
backend/
  app.py              Flask app: API, DB setup, image handling, serves the built frontend
  ingest_example.py   Example of an automated system pushing data
  requirements.txt
  uploads/            Photos (created automatically)
  assets.db           SQLite database (created automatically)
frontend/
  src/api.js          All backend calls in one place
  src/App.jsx         Dashboard, search, routing
  src/components/     AssetForm, AssetCard, AssetModal, Icons
  vite.config.js      Dev proxy to the backend
```

## Run it (on the warehouse computer)

Requirements: Python 3.9+, Node.js 18+.

```bash
# 1) Build the frontend once
cd frontend
npm install
npm run build

# 2) Start the backend (it also serves the built frontend)
cd ../backend
python -m venv .venv
# Windows: .venv\Scripts\activate      Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open **http://localhost:5000** on that computer.

### Open it from other devices (phones, laptops)

The server listens on `0.0.0.0:5000`, so any device on the same Wi-Fi/LAN can use it:

1. Find the server's IP: `ipconfig` (Windows) or `ip a` / `ifconfig` (Linux/Mac), e.g. `192.168.1.20`.
2. On the phone open `http://192.168.1.20:5000`.
3. If it does not load, allow port **5000** in the server's firewall
   (Windows: Defender Firewall > Advanced > Inbound Rules > New Rule > Port 5000).

### Development mode (hot reload)

Terminal 1: `cd backend && python app.py`
Terminal 2: `cd frontend && npm run dev` then open http://localhost:5173
(The Vite dev server proxies `/api` and `/uploads` to port 5000.)

## API

| Method | Endpoint             | Purpose |
|--------|----------------------|---------|
| GET    | `/api/assets`        | List. Query: `search`, `category`, `page`, `per_page` |
| GET    | `/api/assets/<id>`   | One record |
| POST   | `/api/assets`        | Create (multipart: `asset_id`, `category`, `photo`) |
| DELETE | `/api/assets/<id>`   | Delete record and photo |
| GET    | `/api/categories`    | Category suggestions |
| GET    | `/api/stats`         | Dashboard counters |
| POST   | `/api/ingest`        | Automated JSON ingestion (API key required) |
| GET    | `/uploads/<file>`    | Uploaded photo |

### Database schema

```sql
CREATE TABLE assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id   TEXT NOT NULL UNIQUE,   -- business identifier
  category   TEXT NOT NULL,
  photo      TEXT,                   -- filename inside backend/uploads
  source     TEXT NOT NULL DEFAULT 'manual',  -- 'manual' or the name of an automated system
  created_at TEXT NOT NULL           -- ISO-8601 UTC, set by the server
);
```

## Designed for automation

Manual typing is just one *source* of data. The design keeps everything else identical
when a machine is the source:

- `source` column records who created each record (`manual`, `scanner-gate-1`, ...).
- `POST /api/ingest` accepts JSON (optionally a base64 photo) protected by an API key,
  and uses the same validation/storage code as the form.
- The timestamp is always created by the server, so devices with wrong clocks cannot corrupt it.

```bash
curl -X POST http://localhost:5000/api/ingest \
  -H "X-API-Key: change-me-ingest-key" -H "Content-Type: application/json" \
  -d '{"asset_id":"PLT-00500","category":"Pallet","source":"scanner-gate-1"}'
```

Set a real key before going live: `INGEST_API_KEY=your-secret python app.py`.
See `backend/ingest_example.py` for a Python client.

## Possible next steps

User login/roles, HTTPS via a reverse proxy (nginx), PostgreSQL if many concurrent writers,
image thumbnails, barcode scanning in the browser, export to CSV, running as a Windows service / systemd unit.
