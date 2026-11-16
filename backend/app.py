"""
Warehouse Asset Tracker - Backend API (Flask + SQLite)

Run:  python app.py
Serves:
  - REST API under /api/*
  - Uploaded photos under /uploads/<filename>
  - The built React app (frontend/dist) if it exists, so the whole
    system runs on ONE port and any device on the LAN can open it.
"""
import base64
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone

from flask import Flask, g, jsonify, request, send_from_directory

try:
    from flask_cors import CORS
except ImportError:  # CORS is only needed for the Vite dev server
    CORS = None

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.environ.get("ASSET_DB", os.path.join(BASE_DIR, "assets.db"))
UPLOAD_DIR = os.environ.get("ASSET_UPLOADS", os.path.join(BASE_DIR, "uploads"))
FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))

# Used by the automated /api/ingest endpoint (machine-to-machine).
# CHANGE THIS in production (set env var INGEST_API_KEY).
INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "change-me-ingest-key")

MAX_UPLOAD_MB = 8
DEFAULT_CATEGORIES = ["Pallet", "Forklift", "Container", "Shelf / Rack", "Tool", "Vehicle", "Electronics"]

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
if CORS:
    CORS(app)  # allows the Vite dev server (different port) to call the API

os.makedirs(UPLOAD_DIR, exist_ok=True)


# ----------------------------------------------------------------- database
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    with sqlite3.connect(DB_PATH) as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS assets (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id    TEXT NOT NULL UNIQUE,      -- business identifier (barcode / tag number)
                category    TEXT NOT NULL,
                photo       TEXT,                      -- stored filename (not a path)
                source      TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'api' | 'scanner' ...
                created_at  TEXT NOT NULL              -- ISO-8601 UTC, set by the SERVER
            );
            CREATE INDEX IF NOT EXISTS idx_assets_asset_id ON assets(asset_id);
            CREATE INDEX IF NOT EXISTS idx_assets_created  ON assets(created_at DESC);
            """
        )


# ------------------------------------------------------------------ helpers
def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def row_to_dict(row):
    d = dict(row)
    d["photo_url"] = f"/uploads/{d['photo']}" if d.get("photo") else None
    return d


def detect_image_ext(data: bytes):
    """Check the real file signature (magic bytes), not just the filename."""
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    return None


def save_image(data: bytes):
    ext = detect_image_ext(data)
    if not ext:
        raise ValueError("Photo must be a JPG, PNG, WEBP or GIF image.")
    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(data)
    return filename


def validate_fields(asset_id, category):
    asset_id = (asset_id or "").strip()
    category = (category or "").strip()
    if not asset_id:
        raise ValueError("Asset ID is required.")
    if len(asset_id) > 64 or not re.match(r"^[\w\-./ ]+$", asset_id):
        raise ValueError("Asset ID may only contain letters, numbers, spaces and - _ . /")
    if not category:
        raise ValueError("Asset category is required.")
    if len(category) > 64:
        raise ValueError("Category is too long (max 64 characters).")
    return asset_id, category


def create_asset(asset_id, category, photo_bytes, source):
    asset_id, category = validate_fields(asset_id, category)
    db = get_db()
    if db.execute("SELECT 1 FROM assets WHERE asset_id = ?", (asset_id,)).fetchone():
        raise FileExistsError(f"Asset ID '{asset_id}' already exists.")
    filename = save_image(photo_bytes) if photo_bytes else None
    cur = db.execute(
        "INSERT INTO assets (asset_id, category, photo, source, created_at) VALUES (?,?,?,?,?)",
        (asset_id, category, filename, source, now_iso()),
    )
    db.commit()
    row = db.execute("SELECT * FROM assets WHERE id = ?", (cur.lastrowid,)).fetchone()
    return row_to_dict(row)


def error(message, status=400):
    return jsonify({"error": message}), status


def int_arg(name, default):
    try:
        return int(request.args.get(name, default))
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------- endpoints
@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "time": now_iso()})


@app.get("/api/assets")
def list_assets():
    q = (request.args.get("search") or "").strip()
    category = (request.args.get("category") or "").strip()
    page = max(int_arg("page", 1), 1)
    per_page = min(max(int_arg("per_page", 12), 1), 100)

    where, params = [], []
    if q:
        where.append("asset_id LIKE ?")
        params.append(f"%{q}%")
    if category:
        where.append("category = ?")
        params.append(category)
    clause = ("WHERE " + " AND ".join(where)) if where else ""

    db = get_db()
    total = db.execute(f"SELECT COUNT(*) FROM assets {clause}", params).fetchone()[0]
    rows = db.execute(
        f"SELECT * FROM assets {clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
        params + [per_page, (page - 1) * per_page],
    ).fetchall()
    return jsonify(
        {
            "items": [row_to_dict(r) for r in rows],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": max((total + per_page - 1) // per_page, 1),
        }
    )


@app.get("/api/assets/<int:rid>")
def get_asset(rid):
    row = get_db().execute("SELECT * FROM assets WHERE id = ?", (rid,)).fetchone()
    if not row:
        return error("Record not found.", 404)
    return jsonify(row_to_dict(row))


@app.post("/api/assets")
def post_asset():
    """Manual entry from the operator form (multipart/form-data)."""
    photo = request.files.get("photo")
    photo_bytes = photo.read() if photo and photo.filename else None
    if not photo_bytes:
        return error("Asset photograph is required.")
    try:
        item = create_asset(
            request.form.get("asset_id"), request.form.get("category"), photo_bytes, "manual"
        )
    except FileExistsError as e:
        return error(str(e), 409)
    except ValueError as e:
        return error(str(e))
    return jsonify(item), 201


@app.delete("/api/assets/<int:rid>")
def delete_asset(rid):
    db = get_db()
    row = db.execute("SELECT * FROM assets WHERE id = ?", (rid,)).fetchone()
    if not row:
        return error("Record not found.", 404)
    db.execute("DELETE FROM assets WHERE id = ?", (rid,))
    db.commit()
    if row["photo"]:
        try:
            os.remove(os.path.join(UPLOAD_DIR, row["photo"]))
        except OSError:
            pass
    return jsonify({"deleted": rid})


@app.get("/api/categories")
def categories():
    rows = get_db().execute("SELECT DISTINCT category FROM assets ORDER BY category").fetchall()
    used = [r["category"] for r in rows]
    return jsonify(used + [c for c in DEFAULT_CATEGORIES if c not in used])


@app.get("/api/stats")
def stats():
    db = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return jsonify(
        {
            "total": db.execute("SELECT COUNT(*) FROM assets").fetchone()[0],
            "today": db.execute(
                "SELECT COUNT(*) FROM assets WHERE created_at LIKE ?", (today + "%",)
            ).fetchone()[0],
            "categories": db.execute("SELECT COUNT(DISTINCT category) FROM assets").fetchone()[0],
            "automated": db.execute("SELECT COUNT(*) FROM assets WHERE source != 'manual'").fetchone()[0],
        }
    )


@app.post("/api/ingest")
def ingest():
    """
    Machine-to-machine endpoint: lets a scanner / camera system / ERP push
    records automatically instead of an operator typing them.

    POST /api/ingest        Header: X-API-Key: <INGEST_API_KEY>
    JSON: { "asset_id": "...", "category": "...",
            "photo_base64": "<optional base64 image>", "source": "scanner-gate-1" }
    """
    if request.headers.get("X-API-Key") != INGEST_API_KEY:
        return error("Invalid or missing API key.", 401)
    data = request.get_json(silent=True) or {}
    photo_bytes = None
    if data.get("photo_base64"):
        try:
            photo_bytes = base64.b64decode(str(data["photo_base64"]).split(",")[-1])
        except Exception:
            return error("photo_base64 is not valid base64.")
    source = re.sub(r"[^\w\-.]", "", str(data.get("source") or "api"))[:32] or "api"
    try:
        item = create_asset(data.get("asset_id"), data.get("category"), photo_bytes, source)
    except FileExistsError as e:
        return error(str(e), 409)
    except ValueError as e:
        return error(str(e))
    return jsonify(item), 201


@app.errorhandler(413)
def too_large(_e):
    return error(f"Photo is too large. Maximum size is {MAX_UPLOAD_MB} MB.", 413)


# ------------------------------------------------- uploads + built frontend
@app.get("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def frontend(path):
    if path.startswith("api/"):
        return error("Not found.", 404)
    if os.path.isdir(FRONTEND_DIST):
        if path and os.path.isfile(os.path.join(FRONTEND_DIST, path)):
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, "index.html")
    return (
        "<h3>API is running.</h3><p>Frontend not built yet. Run <code>npm run build</code> "
        "inside /frontend, or use <code>npm run dev</code> for development.</p>"
    )


init_db()

if __name__ == "__main__":
    # host=0.0.0.0 => reachable from other devices on the warehouse network
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
