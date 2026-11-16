"""
Example of an AUTOMATED data source (scanner / camera / ERP) pushing records
to the API instead of an operator typing them.

Usage:  python ingest_example.py PLT-00500 Pallet [photo.jpg]
Needs:  pip install requests
"""
import base64
import os
import sys

import requests

API = os.environ.get("ASSET_API", "http://localhost:5000")
KEY = os.environ.get("INGEST_API_KEY", "change-me-ingest-key")

asset_id, category = sys.argv[1], sys.argv[2]
payload = {"asset_id": asset_id, "category": category, "source": "scanner-gate-1"}
if len(sys.argv) > 3:
    with open(sys.argv[3], "rb") as f:
        payload["photo_base64"] = base64.b64encode(f.read()).decode()

r = requests.post(f"{API}/api/ingest", json=payload, headers={"X-API-Key": KEY}, timeout=15)
print(r.status_code, r.json())
