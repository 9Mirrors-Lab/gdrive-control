import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST(req: Request) {
  try {
    const pythonExecutable = '/Volumes/Fulcrum/Develop/gdrive-control/venv/bin/python';
    const scriptPath = '/Volumes/Fulcrum/Develop/gdrive-control/scripts/07_migration_map.py';
    const dedupScriptPath = '/Volumes/Fulcrum/Develop/gdrive-control/scripts/08_dedup.py';
    
    // 1. Re-run Phase 7 Migration Mapping
    const { stdout: stdout7, stderr: stderr7 } = await execAsync(`${pythonExecutable} ${scriptPath}`);
    console.log("Phase 7 Output:", stdout7);
    if (stderr7) console.error("Phase 7 Error:", stderr7);

    // 2. Re-run Phase 8 Deduplication
    const { stdout: stdout8, stderr: stderr8 } = await execAsync(`${pythonExecutable} ${dedupScriptPath}`);
    console.log("Phase 8 Output:", stdout8);
    if (stderr8) console.error("Phase 8 Error:", stderr8);

    // 3. Update operation scripts
    await execAsync(`cp /Volumes/Fulcrum/Develop/gdrive-control/runs/run_20260306_151014/07-migration/dry_run_move.sh /Volumes/Fulcrum/Develop/gdrive-control/ops/dry-run/01_migration_move.sh`);
    await execAsync(`cp /Volumes/Fulcrum/Develop/gdrive-control/runs/run_20260306_151014/08-dedup/dry_run_quarantine.sh /Volumes/Fulcrum/Develop/gdrive-control/ops/dry-run/02_quarantine_duplicates.sh`);

    return NextResponse.json({ success: true, message: "Remapping complete" });
  } catch (error: any) {
    console.error("Remapping Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}