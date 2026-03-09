import subprocess
import json
import pandas as pd
import re
import os

print("Listing files from Google Drive...")
ls_cmd = ["/opt/homebrew/bin/rclone", "lsjson", "-R", "gdrive:1.Organize"]
ls_output = subprocess.check_output(ls_cmd)
files = json.loads(ls_output)

untitled_sheets = [f for f in files if "Untitled spreadsheet" in f.get("Name", "")]
print(f"Found {len(untitled_sheets)} Untitled spreadsheets in 1.Organize.")

# Also do Personal & Miscellaneous
ls_cmd2 = ["/opt/homebrew/bin/rclone", "lsjson", "-R", "gdrive:Personal & Miscellaneous"]
ls_output2 = subprocess.check_output(ls_cmd2)
files2 = json.loads(ls_output2)
untitled_sheets2 = [f for f in files2 if "Untitled spreadsheet" in f.get("Name", "")]
print(f"Found {len(untitled_sheets2)} Untitled spreadsheets in Personal & Miscellaneous.")

TEMP_DIR = "/tmp/untitled_sheets"
os.makedirs(TEMP_DIR, exist_ok=True)

def generate_untitled_name(snippet):
    if not isinstance(snippet, str) or not snippet.strip():
        return None
    clean_snip = re.sub(r'[^\w\s]', ' ', snippet)
    words = clean_snip.split()
    meaningful_words = [w.capitalize() for w in words if len(w) > 2]
    if not meaningful_words:
        meaningful_words = [w.capitalize() for w in words[:4]]
    new_base = " ".join(meaningful_words[:5])
    if not new_base:
        return None
    return new_base

def process_sheets(sheets_list, remote_base):
    for f in sheets_list:
        path = f["Path"]
        remote_path = f"gdrive:{remote_base}/{path}"
        local_path = os.path.join(TEMP_DIR, "temp.xlsx")
        
        print(f"Processing: {path}")
        try:
            # Download
            subprocess.run(["/opt/homebrew/bin/rclone", "copyto", remote_path, local_path], check=True, capture_output=True)
            
            # Read
            try:
                df = pd.read_excel(local_path, header=None)
            except Exception as read_err:
                print(f"  Cannot read as excel: {read_err}")
                continue
                
            texts = []
            for i, row in df.head(10).iterrows():
                for val in row:
                    if pd.notna(val) and str(val).strip():
                        texts.append(str(val).strip())
            
            if not texts:
                print("  File is empty.")
                continue
                
            snippet = " ".join(texts[:10])
            new_name_base = generate_untitled_name(snippet)
            
            if new_name_base:
                folder = os.path.dirname(path)
                # Keep the original extension it was presented as
                ext = ".xlsx"
                new_remote_path = f"gdrive:{remote_base}/{folder}/{new_name_base}{ext}" if folder else f"gdrive:{remote_base}/{new_name_base}{ext}"
                
                print(f"  Renaming to: {new_remote_path}")
                
                # Execute rename
                subprocess.run(["/opt/homebrew/bin/rclone", "moveto", remote_path, new_remote_path], check=True, capture_output=True)
            else:
                print("  No meaningful content found to rename.")
                
        except subprocess.CalledProcessError as e:
            print(f"  Rclone error: {e.stderr.decode('utf-8')}")
        except Exception as e:
            print(f"  Error: {e}")

process_sheets(untitled_sheets, "1.Organize")
process_sheets(untitled_sheets2, "Personal & Miscellaneous")

print("Done renaming on remote.")
