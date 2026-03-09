import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const BASE_DIR = '/Volumes/Fulcrum/Develop/gdrive-control';

export async function GET() {
  try {
    const reportPath = path.join(BASE_DIR, 'reports', 'odd_filenames_report.csv');
    const logPath = path.join(BASE_DIR, 'reports', 'auto_rename_log.csv');

    let totalOddFiles = 0;
    let oddFilesBreakdown: Record<string, number> = {};
    let actionHistory: any[] = [];

    if (fs.existsSync(reportPath)) {
      const fileContent = fs.readFileSync(reportPath, 'utf-8');
      const records = parse(fileContent, { columns: true, skip_empty_lines: true });
      totalOddFiles = records.length;
      
      records.forEach((record: any) => {
        const cat = record.Category;
        if (!oddFilesBreakdown[cat]) oddFilesBreakdown[cat] = 0;
        oddFilesBreakdown[cat]++;
      });
    }

    if (fs.existsSync(logPath)) {
      const fileContent = fs.readFileSync(logPath, 'utf-8');
      const records = parse(fileContent, { 
        columns: true, 
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true 
      });
      actionHistory = records.reverse(); // Newest first
    }

    return NextResponse.json({
      totalOddFiles,
      oddFilesBreakdown,
      actionHistory
    });
  } catch (error) {
    console.error('Error fetching naming health data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
