# gdrive-control

Scripts and tooling for Google Drive inventory, migration planning, and content governance (rclone, extraction lists, semantic rename, migration scripts).

## Structure

- **scripts/** – Python pipelines: inventory parsing, extraction lists, structure analysis, scoring, migration map, dedup, renamers, migration script generation
- **ops/** – Dry-run and execution shell scripts for migration and quarantine
- **reports/** – Generated CSVs and logs
- **dashboard/** – Next.js app for migration approval and review
- **configs/** – Configuration
- **runs/** – Per-run outputs (inventory, lists, approvals); typically not committed

## Setup

- Python 3 with venv; install deps as needed for scripts
- rclone configured with remote `gdrive:` (see project rules for binary path)
- Dashboard: `cd dashboard && npm install && npm run dev`

## Usage

Run scripts in order (see script names for pipeline order). Use dry-run scripts in `ops/dry-run/` before executing.
