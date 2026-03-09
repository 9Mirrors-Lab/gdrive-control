import json
import pandas as pd
from collections import Counter
import re
from pathlib import Path

RUN_ID = "run_20260306_151014"
BASE_DIR = f"/Volumes/Fulcrum/Develop/gdrive-control/runs/{RUN_ID}"
INVENTORY_FILE = f"{BASE_DIR}/01-inventory/files.lsjson"
OUTPUT_DIR = f"{BASE_DIR}/09-standards"

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

data = json.loads(Path(INVENTORY_FILE).read_text())

# Standard violation checks
# 1. Names containing "Copy of", "Untitled"
# 2. Names with irregular characters (too many dashes, underscores mixed, etc.)
# 3. Path depth > 5

violations = []
file_types = Counter()

def check_naming_standards(path, filename, depth):
    issues = []
    
    # Check for lazy naming
    if re.search(r'(?i)^(copy of|untitled)', filename):
        issues.append("Lazy/Default Naming")
        
    # Check for versioning clutter (e.g. file_v1_final_final.pdf)
    if re.search(r'(?i)(final|v\d+).*(final|v\d+)', filename):
        issues.append("Messy Versioning String")
        
    # Depth check
    if depth > 5:
        issues.append("Excessive Nesting Depth")
        
    # Special character check (excluding standard allowed chars)
    if re.search(r'[<>:\"/\\|?*]', filename):
        issues.append("Illegal Characters in Name")

    return issues

for item in data:
    path = item.get("Path", "")
    filename = Path(path).name
    depth = len(path.split("/"))
    
    issues = check_naming_standards(path, filename, depth)
    
    if issues:
        violations.append({
            "Path": path,
            "Violations": " | ".join(issues)
        })

df_violations = pd.DataFrame(violations)
df_violations.to_csv(f"{OUTPUT_DIR}/standards_violations.csv", index=False)

# Generate Standards Markdown Document
standards_doc = """# Google Drive Organizational Standards

Based on the Phase 4 Structural Analysis and Phase 9 Auditing, the following standards must be adhered to in order to maintain Drive health.

## 1. Naming Conventions
* **Avoid Lazy Naming:** Files starting with "Copy of" or "Untitled" are strictly forbidden. 
* **Versioning:** Do not use `_final_v2` strings. Rely on Google Drive's built-in version history for major documents. If manual versioning is needed, use standard semantic versioning (e.g. `v1.0`).
* **Special Characters:** Do not use `< > : " / \ | ? *` in folder or file names.

## 2. Structural Hygiene (Nesting)
* **Maximum Depth:** Folders should not exceed 5 levels deep.
  * *Example of bad practice:* `/01-Active/Projects/2026/ClientX/Design/Drafts/Old/` (7 levels)
* **Hotspot Prevention:** Do not dump more than 50 active files of mixed types into a single flat directory. Use sub-directories (e.g. `/Media`, `/Docs`).

## 3. Governance Metrics
The current scan detected **{violation_count}** violations of these standards across the Drive.

These items should be renamed or restructured during the next scheduled cleanup sprint.
"""

with open(f"{OUTPUT_DIR}/standards.md", "w") as f:
    f.write(standards_doc.format(violation_count=len(violations)))

print(f"Standards audit complete. Found {len(violations)} violations.")
print(f"Artifacts saved to {OUTPUT_DIR}/")
