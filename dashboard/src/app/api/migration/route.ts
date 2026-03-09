import { NextResponse } from 'next/server';
import { getMigrationData } from '@/lib/data';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const GDRIVE_CONTROL_DIR = path.join(process.cwd(), '..');
const SEMANTIC_LOG_PATH = path.join(GDRIVE_CONTROL_DIR, 'reports', 'semantic_rename_execution_log.csv');
const SEMANTIC_LOG_ABSOLUTE = '/Volumes/Fulcrum/Develop/gdrive-control/reports/semantic_rename_execution_log.csv';

function loadSemanticRenameMap(): Map<string, string> {
  const map = new Map<string, string>();
  const logPath = fs.existsSync(SEMANTIC_LOG_PATH) ? SEMANTIC_LOG_PATH : SEMANTIC_LOG_ABSOLUTE;
  if (!fs.existsSync(logPath)) return map;
  const raw = fs.readFileSync(logPath, 'utf-8');
  const parsed = Papa.parse<{ ID: string; OriginalPath: string; NewName: string; Status: string }>(raw, {
    header: true,
    skipEmptyLines: true,
  });
  for (const row of parsed.data) {
    if (row.ID && row.NewName && row.Status === 'Success') {
      map.set(row.ID, row.NewName);
    }
  }
  return map;
}

function pathDirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i <= 0 ? '' : p.slice(0, i);
}

export async function GET() {
  try {
    const data = getMigrationData() as Array<{ ID?: string; Path?: string; TargetPath?: string; [k: string]: unknown }>;
    const semanticNewNameByID = loadSemanticRenameMap();

    const enriched = data.map((row) => {
      const id = row.ID;
      const pathVal = row.Path ?? '';
      const targetPath = row.TargetPath ?? '';
      const newName = id ? semanticNewNameByID.get(String(id)) : undefined;

      if (newName) {
        return {
          ...row,
          Path: pathDirname(pathVal) ? `${pathDirname(pathVal)}/${newName}` : newName,
          TargetPath: pathDirname(targetPath) ? `${pathDirname(targetPath)}/${newName}` : newName,
        };
      }
      return row;
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load migration data' }, { status: 500 });
  }
}
