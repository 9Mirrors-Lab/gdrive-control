import json
import pandas as pd
from collections import defaultdict
from pathlib import Path

RUN_ID = "run_20260306_151014"
BASE_DIR = f"/Volumes/Fulcrum/Develop/gdrive-control/runs/{RUN_ID}"
INVENTORY_FILE = f"{BASE_DIR}/01-inventory/files.lsjson"
OUTPUT_DIR = f"{BASE_DIR}/04-structure"

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

data = json.loads(Path(INVENTORY_FILE).read_text())

folder_stats = defaultdict(lambda: {"count": 0, "size": 0, "mimes": set()})

for item in data:
    path = item.get("Path", "")
    size = item.get("Size", 0)
    if size == -1: size = 0
    mime = item.get("MimeType", "unknown")
    
    # Get directory path
    parent = str(Path(path).parent)
    if parent == ".": parent = "root"
    
    folder_stats[parent]["count"] += 1
    folder_stats[parent]["size"] += size
    folder_stats[parent]["mimes"].add(mime)

results = []
for folder, stats in folder_stats.items():
    depth = len(folder.split("/")) if folder != "root" else 0
    results.append({
        "Folder": folder,
        "Depth": depth,
        "FileCount": stats["count"],
        "TotalSizeMB": stats["size"] / (1024 * 1024),
        "UniqueMimeTypes": len(stats["mimes"]),
        "MixedContentScore": len(stats["mimes"]) / max(1, stats["count"])
    })

df = pd.DataFrame(results)
df = df.sort_values("MixedContentScore", ascending=False)
df.to_csv(f"{OUTPUT_DIR}/folder_metrics.csv", index=False)

hotspots = df[(df["FileCount"] > 10) & (df["UniqueMimeTypes"] > 5)]
hotspots.to_csv(f"{OUTPUT_DIR}/hotspots.csv", index=False)

with open(f"{OUTPUT_DIR}/structure_report.md", "w") as f:
    f.write("# Structural Analysis Report\n\n")
    f.write(f"Total Folders with Files: {len(df)}\n")
    f.write(f"Max Folder Depth: {df['Depth'].max()}\n\n")
    f.write("## Top Clutter Hotspots\n")
    f.write(hotspots.head(10).to_markdown(index=False))

print(f"Structure analysis complete. Wrote {len(df)} folder metrics to {OUTPUT_DIR}/folder_metrics.csv")
