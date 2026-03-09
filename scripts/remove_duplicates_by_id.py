import os
import glob
import pandas as pd
import subprocess
import time

BASE_DIR = "/Volumes/Fulcrum/Develop/gdrive-control"

# Get latest run
runs = sorted(glob.glob(f"{BASE_DIR}/runs/run_*"))
if not runs:
    print("No runs found")
    exit(1)
latest_run = runs[-1]
RUN_ID = os.path.basename(latest_run)

# Load migration map
map_path = f"{latest_run}/07-migration/migration_map.csv"
if not os.path.exists(map_path):
    print("Migration map not found.")
    exit(1)

df_map = pd.read_csv(map_path)

if "ID" not in df_map.columns:
    print("Error: ID column missing in migration map.")
    exit(1)

# Find collisions based on TargetPath
df_collisions = df_map[df_map.duplicated(subset=["TargetPath"], keep=False)]

groups = df_collisions.groupby("TargetPath")

files_to_remove = []

for target_path, group in groups:
    sorted_group = group.sort_values(by=["Size", "Score", "AgeDays"], ascending=[False, False, True])
    winner = sorted_group.iloc[0]
    # Use ID to distinguish winner from losers
    losers = group[group["ID"] != winner["ID"]]
    
    for _, loser in losers.iterrows():
        files_to_remove.append({
            "ID": loser["ID"],
            "Path": loser["Path"],
            "Size": loser["Size"]
        })

print(f"Found {len(files_to_remove)} duplicate files to remove.")

success_count = 0
error_count = 0

for idx, f in enumerate(files_to_remove):
    file_id = f["ID"]
    # Replace slashes and other potentially problematic chars in the target filename
    safe_name = f["Path"].replace("/", "_").replace(":", "_")
    target_path = f"_quarantine/duplicates/{RUN_ID}/{safe_name}"
    
    print(f"[{idx+1}/{len(files_to_remove)}] Removing: {f['Path']} (ID: {file_id})")
    
    # moveid command: rclone backend moveid <remote> <id> <target_path>
    cmd = [
        "rclone", "backend", "moveid", "gdrive:",
        file_id, target_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        # Ignore errors if the file has already been moved/deleted (e.g. from previous script runs)
        if "file not found" in result.stderr.lower() or "not found" in result.stderr.lower() or "googleapi: Error 404" in result.stderr:
            print(f"  -> File already moved or not found.")
            success_count += 1
        else:
            print(f"  -> Error: {result.stderr.strip()}")
            error_count += 1
    else:
        print(f"  -> Success.")
        success_count += 1

print("\n--- Summary ---")
print(f"Total duplicates processed: {len(files_to_remove)}")
print(f"Successfully quarantined/removed: {success_count}")
print(f"Errors: {error_count}")
