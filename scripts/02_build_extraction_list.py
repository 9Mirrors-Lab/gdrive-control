import json
import os
from pathlib import Path

RUN_ID = "run_20260306_151014"
BASE_DIR = f"/Volumes/Fulcrum/Develop/gdrive-control/runs/{RUN_ID}"
INVENTORY_FILE = f"{BASE_DIR}/01-inventory/files.lsjson"
LISTS_DIR = f"{BASE_DIR}/02-content/lists"

os.makedirs(LISTS_DIR, exist_ok=True)

EXTRACTABLE_MIMES = {
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
    "text/csv",
    "application/msword",
    "text/plain",
    "application/json",
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.presentation"
}

data = json.loads(Path(INVENTORY_FILE).read_text())

extractable_files = []
for item in data:
    mime = item.get("MimeType", "")
    if mime in EXTRACTABLE_MIMES:
        extractable_files.append(item["Path"])

batch_file = Path(LISTS_DIR) / "batch-001.txt"
batch_file.write_text("\n".join(extractable_files))

print(f"Found {len(extractable_files)} extractable files.")
print(f"List written to {batch_file}")
