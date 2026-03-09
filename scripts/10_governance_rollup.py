import json
import pandas as pd
from datetime import datetime
import os
from pathlib import Path

RUN_ID = "run_20260306_151014"
BASE_DIR = f"/Volumes/Fulcrum/Develop/gdrive-control/runs/{RUN_ID}"
INVENTORY_FILE = f"{BASE_DIR}/01-inventory/files.lsjson"
STANDARDS_VIOLATIONS_FILE = f"{BASE_DIR}/09-standards/standards_violations.csv"
OUTPUT_DIR = f"{BASE_DIR}/10-governance"

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# 1. Read files
data = json.loads(Path(INVENTORY_FILE).read_text())
df_violations = pd.read_csv(STANDARDS_VIOLATIONS_FILE)

# 2. Compute Governance KPIs
total_files = len(data)
total_size = sum(item.get("Size", 0) for item in data if item.get("Size") != -1)
violation_count = len(df_violations)

# File age statistics
now = datetime.utcnow()
stale_count = 0
for item in data:
    mod_time_str = item.get("ModTime", "")
    try:
        mod_time = pd.to_datetime(mod_time_str).replace(tzinfo=None)
        if (now - mod_time).days > 365:
            stale_count += 1
    except:
        pass

# 3. Create JSON payload for dashboard tracking
kpis = {
    "ScanDate": now.isoformat(),
    "TotalFiles": total_files,
    "TotalSizeGB": round(total_size / (1024**3), 2),
    "StaleFileCount": stale_count,
    "StaleFilePercentage": round((stale_count / total_files) * 100, 1),
    "StandardsViolations": violation_count,
    "ComplianceScore": round(100 - ((violation_count / total_files) * 100), 1)
}

with open(f"{OUTPUT_DIR}/governance_metrics.json", "w") as f:
    json.dump(kpis, f, indent=2)

# 4. Generate the Governance Playbook (Runbook for operator)
playbook = f"""# Google Drive Governance Playbook

## Objective
Prevent the drive from returning to a disorganized state. This playbook defines operational practices for maintaining the new structure.

## 1. Cadence and Scans
The AI Google Drive Architect should execute incremental scans to detect drift.

* **Weekly Incremental Scan:** 
  `rclone lsjson "gdrive:" -R --files-only --max-age 7d > weekly_delta.lsjson`
* **Monthly Full Audit:** 
  Run the full 10-phase pipeline, updating `gdrive-control/runs/`.

## 2. Current KPIs (As of {now.strftime('%Y-%m-%d')})
* **Drive Size:** {kpis['TotalSizeGB']} GB
* **Stale Files (>1 Year Old):** {kpis['StaleFilePercentage']}%
* **Naming/Depth Violations:** {kpis['StandardsViolations']}
* **Overall Compliance Score:** {kpis['ComplianceScore']}%

## 3. Intervention Triggers
If the following thresholds are breached during a scan, manual intervention is required:
1. **Compliance Score drops below 90%** ➔ Run Phase 9 cleanup script.
2. **Stale File Percentage exceeds 40%** ➔ Run Phase 5 Value Scoring and move `archive_candidate` files to deep cold storage (`03-Archive/`).
3. **Collision Count > 50** ➔ Run Phase 8 Deduplication.

## 4. Ingestion Policy
New files should enter through a designated "Triage" folder or be immediately categorized into `01-Active/` or `02-Review/`. Files landing in the root `gdrive:` directory will trigger a structural violation alert in the next scan.
"""

with open(f"{OUTPUT_DIR}/governance_playbook.md", "w") as f:
    f.write(playbook)

# 5. Generate a crontab / systemd stub for automation
cron_stub = f"""# Crontab stub for automated governance tracking
# Run incremental scan every Sunday at 2 AM
0 2 * * 0 /opt/homebrew/bin/rclone lsjson "gdrive:" -R --files-only --max-age 7d > /Volumes/Fulcrum/Develop/gdrive-control/metrics/weekly_$(date +\\%Y%m%d).lsjson

# Run full AI Audit every 1st of the month
0 0 1 * * cd /Volumes/Fulcrum/Develop/gdrive-control && ./run_full_audit.sh
"""

with open(f"{OUTPUT_DIR}/automation.cron", "w") as f:
    f.write(cron_stub)

print("Governance model generated.")
print(f"Compliance Score: {kpis['ComplianceScore']}%")
