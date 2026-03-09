import pandas as pd
import os
import re
import glob
from slugify import slugify
import nltk
from nltk.corpus import stopwords

# Ensure nltk data is available
try:
    stop_words = set(stopwords.words('english'))
except:
    nltk.download('stopwords')
    stop_words = set(stopwords.words('english'))

# Custom stop words specifically for file naming
custom_stops = {'copy', 'of', 'template', 'final', 'new', 'untitled', 'draft', 'version', 'v1', 'v2', 'v3', 'document', 'presentation', 'spreadsheet', 'book'}
all_stops = stop_words.union(custom_stops)

def get_file_type(ext):
    ext = ext.lower()
    if ext in ['.pdf']: return 'pdf'
    if ext in ['.doc', '.docx', '.gdoc', '.txt', '.md', '.rtf']: return 'doc'
    if ext in ['.xls', '.xlsx', '.gsheet', '.csv', '.tsv']: return 'sheet'
    if ext in ['.ppt', '.pptx', '.gslides', '.key']: return 'slide'
    if ext in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']: return 'image'
    if ext in ['.mp4', '.mov', '.avi', '.webm']: return 'video'
    if ext in ['.mp3', '.wav', '.ogg']: return 'audio'
    if ext in ['.py', '.js', '.ts', '.html', '.css', '.json', '.ipynb', '.sh']: return 'code'
    if ext in ['.zip', '.tar', '.gz', '.rar']: return 'archive'
    return 'data'

def clean_topic(filename):
    # Remove extension
    name, _ = os.path.splitext(filename)
    
    # Remove random hashes or UUIDs (heuristics)
    name = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '', name, flags=re.IGNORECASE) # UUID
    name = re.sub(r'[0-9a-f]{20,}', '', name, flags=re.IGNORECASE) # Hash
    
    # Remove things in brackets or parentheses that might be noise like (1) or [Draft]
    name = re.sub(r'\([^)]*\)', '', name)
    name = re.sub(r'\[[^\]]*\]', '', name)
    
    # Convert to slug (lowercase, ascii, no special chars, separator='_')
    slug = slugify(name, separator='_')
    
    # Remove stop words and deduplicate words while preserving order
    words = slug.split('_')
    filtered_words = []
    seen = set()
    for w in words:
        # Keep numeric dates or specific numbers if they aren't just isolated digits (unless it's a year)
        if w in all_stops and w != '':
            continue
        if w not in seen and w != '':
            seen.add(w)
            filtered_words.append(w)
            
    # If the filtering removed everything (e.g. file was just "Untitled Document"), return "unknown"
    if not filtered_words:
        return "unknown"
        
    return "_".join(filtered_words)

def generate_ai_filename(original_name, file_id):
    ext = os.path.splitext(original_name)[1].lower()
    file_type = get_file_type(ext)
    topic_slug = clean_topic(original_name)
    
    # Add date if present in the format YYYY-MM-DD
    date_match = re.search(r'\d{4}-\d{2}-\d{2}', original_name)
    if date_match:
        date_str = date_match.group(0).replace('-', '_')
        topic_slug = topic_slug.replace(date_str, '').strip('_')
        topic_slug = re.sub(r'_+', '_', topic_slug)
        topic_slug = f"{topic_slug}__{date_str}" if topic_slug else date_str

    # Take first 6 chars of ID for uniqueness without making it too long
    short_id = file_id[:6] if pd.notna(file_id) and len(str(file_id)) >= 6 else str(file_id)
    
    # Assemble: <Type>__<Topic>__<ID>.<ext>
    # Note: user requested '_' instead of '-' for separators
    new_name = f"{file_type}__{topic_slug}__{short_id}{ext}"
    return new_name

import subprocess

def main():
    runs = sorted(glob.glob("/Volumes/Fulcrum/Develop/gdrive-control/runs/run_*"))
    if not runs:
        print("No runs found.")
        return
        
    latest_run = runs[-1]
    map_path = f"{latest_run}/07-migration/migration_map_resolved.csv"
    
    if not os.path.exists(map_path):
        print(f"Could not find {map_path}")
        return
        
    df = pd.read_csv(map_path)
    df = df[df['MimeType'] != 'inode/directory'] # Skip directories
    
    # Load previously completed renames if any
    log_path = "/Volumes/Fulcrum/Develop/gdrive-control/reports/semantic_rename_execution_log.csv"
    processed_ids = set()
    if os.path.exists(log_path):
        with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                if line.strip() and not line.startswith('ID,'):
                    parts = line.split(',')
                    if parts:
                        processed_ids.add(parts[0])
                        
    log_file = open(log_path, "a", encoding='utf-8')
    if not os.path.exists(log_path) or os.path.getsize(log_path) == 0:
        log_file.write("ID,OriginalPath,OriginalName,NewName,Status\n")

    RCLONE_BIN = "/opt/homebrew/bin/rclone"

    # Count how many left
    df_to_process = df[~df['ID'].isin(processed_ids)]
    print(f"Found {len(df_to_process)} files left to rename out of {len(df)} total files.")

    results = []
    for idx, row in df_to_process.iterrows():
        path = row['Path']
        file_id = row['ID']
        original_name = os.path.basename(path)
        
        if "SupabaseBackups" in path:
            print(f"[{idx+1}/{len(df_to_process)}] Skipping SupabaseBackups: {original_name}")
            continue

        new_name = generate_ai_filename(original_name, file_id)
        
        # Build new destination path
        folder_path = os.path.dirname(path)
        dest_path = f"{folder_path}/{new_name}" if folder_path else new_name
        
        print(f"[{idx+1}/{len(df_to_process)}] {original_name} -> {new_name}")
        
        # If the name is exactly the same, skip moving
        if new_name == original_name:
            log_file.write(f"{file_id},{path},{original_name},{new_name},Skipped_SameName\n")
            log_file.flush()
            continue

        try:
            cmd = [RCLONE_BIN, "backend", "moveid", "gdrive:", str(file_id), dest_path]
            res = subprocess.run(cmd, capture_output=True, text=True)
            
            if res.returncode == 0:
                print("  -> Success")
                log_file.write(f"{file_id},{path},{original_name},{new_name},Success\n")
            else:
                err_msg = res.stderr.strip().replace('\n', ' ')
                print(f"  -> Error: {err_msg}")
                log_file.write(f"{file_id},{path},{original_name},{new_name},Error\n")
        except Exception as e:
            print(f"  -> Execution Error: {e}")
            log_file.write(f"{file_id},{path},{original_name},{new_name},Error\n")
            
        log_file.flush()

    log_file.close()
    print("Semantic renaming complete.")

if __name__ == "__main__":
    main()
