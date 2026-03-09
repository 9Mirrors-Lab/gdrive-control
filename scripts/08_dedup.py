import pandas as pd
from pathlib import Path
import os

RUN_ID = "run_20260306_151014"
BASE_DIR = f"/Volumes/Fulcrum/Develop/gdrive-control/runs/{RUN_ID}"
MIGRATION_MAP_FILE = f"{BASE_DIR}/07-migration/migration_map.csv"
COLLISIONS_FILE = f"{BASE_DIR}/07-migration/collisions.csv"
OUTPUT_DIR = f"{BASE_DIR}/08-dedup"

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

print("Loading migration map and collisions...")
df_map = pd.read_csv(MIGRATION_MAP_FILE)
df_collisions = pd.read_csv(COLLISIONS_FILE)

# Read manual approvals if they exist
approvals_dir = Path(f"{BASE_DIR}/approvals")
manual_overrides = {}
if approvals_dir.exists():
    for f in approvals_dir.glob("canonical_selection_*.json"):
        import json
        try:
            data = json.loads(f.read_text())
            target_path = data.get("targetPath")
            canonical = data.get("canonical")
            if target_path and canonical:
                manual_overrides[target_path] = canonical
        except Exception as e:
            print(f"Failed to read approval file {f}: {e}")

# Process groups
groups = df_collisions.groupby("TargetPath")

dedup_results = []
quarantine_list = []

for target_path, group in groups:
    # Check if there's a manual override for this cluster
    if target_path in manual_overrides:
        winner_path = manual_overrides[target_path]
        winner = group[group["Path"] == winner_path].iloc[0] if not group[group["Path"] == winner_path].empty else group.iloc[0]
    else:
        # Automatic Canonical Selection Logic
        # 1. Sort by Size (descending) -> larger files are usually more complete
        # 2. Sort by Score (descending) -> higher value score
        # 3. Sort by AgeDays (ascending) -> more recently modified
        sorted_group = group.sort_values(by=["Size", "Score", "AgeDays"], ascending=[False, False, True])
        winner = sorted_group.iloc[0]

    # All others are losers
    losers = group[group["Path"] != winner["Path"]]

    dedup_results.append({
        "TargetPath": target_path,
        "CanonicalSource": winner["Path"],
        "CanonicalSize": winner["Size"],
        "DuplicateCount": len(losers),
        "ResolutionMethod": "Manual" if target_path in manual_overrides else "Auto"
    })

    # Add losers to quarantine plan
    for _, loser in losers.iterrows():
        safe_filename = loser["Path"].replace("/", "_")
        quarantine_target = f"_quarantine/duplicates/{RUN_ID}/{safe_filename}"
        
        quarantine_list.append({
            "OriginalPath": loser["Path"],
            "QuarantinePath": quarantine_target,
            "Size": loser["Size"],
            "AgeDays": loser["AgeDays"]
        })

df_dedup = pd.DataFrame(dedup_results)
df_dedup.to_csv(f"{OUTPUT_DIR}/canonical_selections.csv", index=False)

df_quarantine = pd.DataFrame(quarantine_list)
df_quarantine.to_csv(f"{OUTPUT_DIR}/quarantine_plan.csv", index=False)

# Now, update the main migration map
print("Updating Migration Map with Deduplication rules...")

# For every file in the quarantine list, update its TargetPath in df_map
quarantine_dict = dict(zip(df_quarantine["OriginalPath"], df_quarantine["QuarantinePath"]))

def apply_dedup_target(row):
    if row["Path"] in quarantine_dict:
        return quarantine_dict[row["Path"]]
    return row["TargetPath"]

df_map["TargetPath"] = df_map.apply(apply_dedup_target, axis=1)

# Recalculate collisions just to be absolutely sure we resolved them
new_collisions = df_map[df_map.duplicated(subset=["TargetPath"], keep=False)]

# Save the resolved map
df_map.to_csv(f"{BASE_DIR}/07-migration/migration_map_resolved.csv", index=False)

print(f"Deduplication complete.")
print(f"Processed {len(groups)} collision clusters.")
print(f"Identified {len(df_dedup)} canonical files and {len(df_quarantine)} duplicates for quarantine.")
print(f"Remaining unresolved collisions: {len(new_collisions)}")

# Generate dry-run script for quarantine
with open(f"{OUTPUT_DIR}/dry_run_quarantine.sh", "w") as f:
    f.write("#!/bin/bash\n")
    f.write(f"# Quarantine Dry Run for {RUN_ID}\n\n")
    for _, row in df_quarantine.iterrows():
        src = row["OriginalPath"].replace('"', '\\"')
        dst = row["QuarantinePath"].replace('"', '\\"')
        f.write(f'rclone move "gdrive:{src}" "gdrive:{dst}" --dry-run\n')

print(f"Dry run quarantine script generated at {OUTPUT_DIR}/dry_run_quarantine.sh")
