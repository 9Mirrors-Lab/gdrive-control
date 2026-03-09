import json
import pandas as pd
from datetime import datetime
from pathlib import Path

RUN_ID = "run_20260306_151014"
BASE_DIR = f"/Volumes/Fulcrum/Develop/gdrive-control/runs/{RUN_ID}"
INVENTORY_FILE = f"{BASE_DIR}/01-inventory/files.lsjson"
OUTPUT_DIR = f"{BASE_DIR}/05-value"

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

data = json.loads(Path(INVENTORY_FILE).read_text())

results = []
now = datetime.utcnow()

for item in data:
    path = item.get("Path", "")
    size = item.get("Size", 0)
    if size == -1: size = 0
    mime = item.get("MimeType", "unknown")
    mod_time_str = item.get("ModTime", "")
    
    try:
        # e.g., 2023-01-01T12:00:00Z
        mod_time = pd.to_datetime(mod_time_str).replace(tzinfo=None)
        age_days = (now - mod_time).days
    except:
        age_days = 3650 # Default 10 years if unknown

    # Basic scoring logic
    # Base score: 100
    # Age penalty: -1 point per 30 days old
    # Type bonus: Office/PDF files get +20
    
    score = 100
    score -= (age_days / 30)
    
    if "openxml" in mime or "pdf" in mime or "google-apps" in mime:
        score += 20
        
    if "untitled" in path.lower() or "copy of" in path.lower():
        score -= 30
        
    score = max(0, min(100, score)) # Normalize to 0-100
    
    if score > 80:
        band = "active"
    elif score > 50:
        band = "review"
    elif score > 20:
        band = "archive_candidate"
    else:
        band = "dormant"
        
    results.append({
        "Path": path,
        "ID": item.get("ID", ""),
        "Size": size,
        "MimeType": mime,
        "AgeDays": age_days,
        "Score": round(score, 1),
        "RetentionBand": band
    })

df = pd.DataFrame(results)
df.to_parquet(f"{OUTPUT_DIR}/value_scores.parquet", index=False)
df.to_csv(f"{OUTPUT_DIR}/value_scores.csv", index=False)

band_counts = df["RetentionBand"].value_counts()
band_counts.to_csv(f"{OUTPUT_DIR}/retention_summary.csv")

print(f"Scoring complete. Distribution:\n{band_counts}")
