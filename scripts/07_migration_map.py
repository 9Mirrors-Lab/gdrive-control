import pandas as pd
from pathlib import Path
import os
import json
import re

RUN_ID = "run_20260306_151014"
BASE_DIR = f"/Volumes/Fulcrum/Develop/gdrive-control/runs/{RUN_ID}"
VALUE_FILE = f"{BASE_DIR}/05-value/value_scores.parquet"
OUTPUT_DIR = f"{BASE_DIR}/07-migration"
RULES_FILE = f"{OUTPUT_DIR}/custom_rules.json"

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# Load custom routing rules if they exist
custom_rules = []
if os.path.exists(RULES_FILE):
    with open(RULES_FILE, 'r') as f:
        custom_rules = json.load(f)

df = pd.read_parquet(VALUE_FILE)

# Read content_index for semantic hints
CONTENT_FILE = f"{BASE_DIR}/02-content/content_index.csv"
if os.path.exists(CONTENT_FILE):
    df_content = pd.read_csv(CONTENT_FILE)
    # Merge snippet into df based on Path
    df = df.merge(df_content[["Path", "Snippet"]], on="Path", how="left")
else:
    df["Snippet"] = ""

import re

def apply_custom_rules(path, filename, mime):
    lower_path = path.lower()
    lower_name = filename.lower()
    lower_mime = str(mime).lower()
    
    for rule in custom_rules:
        condition_type = rule.get("conditionType")
        condition_value = rule.get("conditionValue", "").lower()
        target_domain = rule.get("targetDomain")
        
        if not condition_value or not target_domain:
            continue
            
        if condition_type == "extension" and lower_name.endswith(condition_value):
            return target_domain
        elif condition_type == "path_contains" and condition_value in lower_path:
            return target_domain
        elif condition_type == "name_contains" and condition_value in lower_name:
            return target_domain
        elif condition_type == "mime_type" and condition_value in lower_mime:
            return target_domain
            
    return None

def generate_untitled_name(filename, snippet):
    if not isinstance(snippet, str) or not snippet.strip():
        return filename
    
    # Extract the first few meaningful words from the snippet
    # Remove punctuation, keep alphanumeric and spaces
    clean_snip = re.sub(r'[^\w\s]', ' ', snippet)
    words = clean_snip.split()
    
    # Filter out common stop words or very short words if we have enough
    meaningful_words = [w.capitalize() for w in words if len(w) > 2]
    
    if not meaningful_words:
        # Fallback to the first few raw words
        meaningful_words = [w.capitalize() for w in words[:4]]
    
    # Take up to 5 words
    new_base = " ".join(meaningful_words[:5])
    
    if not new_base:
        return filename
        
    # Get original extension
    _, ext = os.path.splitext(filename)
    
    return f"{new_base}{ext}"

def determine_semantic_topic(path, snippet, filename, mime):
    # 1. First, check if a custom user rule overrides everything
    custom_target = apply_custom_rules(path, filename, mime)
    if custom_target:
        return custom_target
        
    lower_path = path.lower()
    lower_snip = str(snippet).lower()
    lower_name = filename.lower()
    
    # Check for Images and Screenshots
    if filename.endswith((".png", ".jpeg", ".jpg", ".gif", ".svg", ".webp")) or "image" in mime.lower() or "screenshot" in lower_name:
        return "Media & Assets"

    # 1. Career & Past Work
    if any(keyword in lower_path or keyword in lower_snip for keyword in ["softvision", "cognizant", "twister"]):
        if filename.endswith((".pptx", ".ppt", ".key")):
            return "Career & Past Work/Softvision/Presentations & Decks"
        elif filename.endswith((".docx", ".doc", ".txt", ".md", ".pdf")):
            return "Career & Past Work/Softvision/Documents & Specs"
        elif filename.endswith((".xlsx", ".xls", ".csv")):
            return "Career & Past Work/Softvision/Spreadsheets"
        else:
            return "Career & Past Work/Softvision/Other"
    elif any(keyword in lower_path or keyword in lower_snip for keyword in ["kforce", "k force", "k-force"]):
        return "Career & Past Work/Kforce"
    elif any(keyword in lower_path or keyword in lower_snip for keyword in ["client", "ingeniorx", "fiserv", "trizetto", "warner music", "consulting", "workshop", "healtchare", "northeastern", "zumiez", "keybank", "hilton", "blazing zebra"]):
        return "Career & Past Work/Other Client Work"
    elif any(keyword in lower_path or keyword in lower_snip for keyword in ["resume", "cv", "portfolio", "cover letter"]):
        return "Career & Past Work/Career Profiles"

    # 2. Trading & Web3
    if any(keyword in lower_path or keyword in lower_snip or keyword in lower_name for keyword in ["defi", "coin", "marketplace", "etherscan", "crypto", "bitcoin", "ethereum", "wallet", "token", "nft", "blockchain"]):
        return "Trading & Web3/Crypto & Defi"
    elif any(keyword in lower_path or keyword in lower_snip or keyword in lower_name for keyword in ["trade", "trading", "fvg", "fractal", "liquidity", "market structure", "candle", "ohlc", "vibration_point", "vibration point", "cycle_0.25"]):
        return "Trading & Web3/Market Analysis"

    # 3. Media & Fonts (Override above if font)
    if filename.endswith(".otf") or any(keyword in lower_path for keyword in ["fonts", "riley tess", "graffiti", "quicksand"]):
        return "Media & Assets/Fonts & Design"

    # 4. AI & Tech
    if filename.endswith(".ipynb") or "colab" in lower_path:
        return "AI & Tech/Colab Notebooks"
    elif any(keyword in lower_path or keyword in lower_snip for keyword in ["ai", "prompt", "automation", "python", "script", "applet", "api", "gemini", "chatgpt"]):
        return "AI & Tech/Engineering & AI"

    # 5. Design & Product
    if any(keyword in lower_path or keyword in lower_snip for keyword in ["product", "prd", "roadmap", "ux", "wireframe", "agile", "sprint", "usability", "design"]):
        return "Design & Product"

    # 6. Personal & Admin
    if any(keyword in lower_path or keyword in lower_snip for keyword in ["finance", "budget", "ledger", "tax", "metrics", "revenue", "expense", "personal", "household", "workout", "vacation", "child care", "house", "lender", "divorce", "chase", "vaca", "state farm"]):
        return "Personal & Admin"

    return "General Reference"

def determine_target(row):
    original_path = row["Path"]
    filename = os.path.basename(original_path)
    snippet = row.get("Snippet", "")
    mime = row.get("MimeType", "")
    
    # Intelligently rename 'Untitled' files based on their snippet content
    if "untitled" in filename.lower() and snippet:
        filename = generate_untitled_name(filename, snippet)
    
    topic = determine_semantic_topic(original_path, snippet, filename, mime)
    
    # We no longer force a 01-Active, 02-Review, etc. top-level split.
    # The topic itself becomes the root folder.
    return f"{topic}/{filename}"

df["TargetPath"] = df.apply(determine_target, axis=1)
df["Operation"] = "move"

# Check for collisions
collisions = df[df.duplicated(subset=["TargetPath"], keep=False)].sort_values("TargetPath")

# Keep only necessary columns for the CSV
export_cols = ["ID", "Path", "Size", "MimeType", "AgeDays", "Score", "RetentionBand", "TargetPath", "Operation"]
df[export_cols].to_csv(f"{OUTPUT_DIR}/migration_map.csv", index=False)
collisions[export_cols].to_csv(f"{OUTPUT_DIR}/collisions.csv", index=False)

# Generate dry-run move script
with open(f"{OUTPUT_DIR}/dry_run_move.sh", "w") as f:
    f.write("#!/bin/bash\n")
    f.write(f"# Migration Map Dry Run for {RUN_ID}\n\n")
    
    for idx, row in df.head(10).iterrows():
        src = row["Path"].replace('"', '\\"')
        dst = row["TargetPath"].replace('"', '\\"')
        f.write(f'rclone move "gdrive:{src}" "gdrive:_Proposed/{dst}" --dry-run\n')

print(f"Semantic migration mapping complete. {len(collisions)} collisions found. Map written to {OUTPUT_DIR}/migration_map.csv")

