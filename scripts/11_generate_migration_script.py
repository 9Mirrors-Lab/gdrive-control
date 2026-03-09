#!/usr/bin/env python3
"""
Generate migration move script using current (semantic) filenames.
Reads migration_map_resolved.csv and semantic_rename_execution_log.csv,
merges by ID, and outputs rclone move commands with correct source and destination paths.
"""
import os
import glob
import pandas as pd

RUNS_DIR = "/Volumes/Fulcrum/Develop/gdrive-control/runs"
REPORTS_DIR = "/Volumes/Fulcrum/Develop/gdrive-control/reports"
OPS_DIR = "/Volumes/Fulcrum/Develop/gdrive-control/ops/dry-run"

def main():
    runs = sorted(glob.glob(os.path.join(RUNS_DIR, "run_*")))
    if not runs:
        print("No runs found.")
        return
    latest_run = runs[-1]
    map_path = os.path.join(latest_run, "07-migration", "migration_map_resolved.csv")
    if not os.path.exists(map_path):
        print(f"Migration map not found: {map_path}")
        return

    df = pd.read_csv(map_path)
    # Only move files, not directories (rclone move for dirs is different)
    df = df[df["MimeType"] != "inode/directory"]

    # Load semantic rename log: ID -> NewName (only Success)
    semantic_map = {}
    log_path = os.path.join(REPORTS_DIR, "semantic_rename_execution_log.csv")
    if os.path.exists(log_path):
        df_log = pd.read_csv(log_path, on_bad_lines="skip", quoting=1)
        for _, row in df_log.iterrows():
            if row.get("Status") == "Success" and pd.notna(row.get("ID")) and pd.notna(row.get("NewName")):
                semantic_map[str(row["ID"])] = str(row["NewName"])

    os.makedirs(OPS_DIR, exist_ok=True)
    dry_run_path = os.path.join(OPS_DIR, "01_migration_move.sh")
    execute_path = os.path.join(OPS_DIR, "01_migration_move_execute.sh")

    def escape(s):
        return s.replace('\\', '\\\\').replace('"', '\\"')

    with open(dry_run_path, "w") as dry, open(execute_path, "w") as exe:
        header = "#!/bin/bash\n# Migration move script (semantic filenames)\n\n"
        dry.write(header)
        exe.write(header.replace("semantic filenames", "semantic filenames - EXECUTE (no dry-run)"))

        count = 0
        for _, row in df.iterrows():
            path_val = row["Path"]
            target_val = row["TargetPath"]
            file_id = row.get("ID")

            if pd.isna(path_val) or pd.isna(target_val):
                continue
            if "SupabaseBackups" in str(path_val):
                continue

            new_name = semantic_map.get(str(file_id)) if pd.notna(file_id) else None
            if new_name:
                # Current path on Drive after semantic rename
                dir_src = os.path.dirname(path_val)
                dir_dst = os.path.dirname(target_val)
                src = f"{dir_src}/{new_name}" if dir_src else new_name
                dst = f"{dir_dst}/{new_name}" if dir_dst else new_name
            else:
                src = path_val
                dst = target_val

            src_esc = escape(src)
            dst_esc = escape(dst)
            # Destination lives under _Proposed/ to avoid overwriting
            dry.write(f'rclone move "gdrive:{src_esc}" "gdrive:_Proposed/{dst_esc}" --dry-run\n')
            exe.write(f'rclone move "gdrive:{src_esc}" "gdrive:_Proposed/{dst_esc}"\n')
            count += 1

    print(f"Wrote {count} move commands to {dry_run_path} (dry-run) and {execute_path} (execute).")

if __name__ == "__main__":
    main()
