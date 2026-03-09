import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RUN_ID = "run_20260306_151014";
const BASE_DIR = `/Volumes/Fulcrum/Develop/gdrive-control/runs/${RUN_ID}`;
const RULES_FILE = path.join(BASE_DIR, '07-migration', 'custom_rules.json');

export async function GET() {
  try {
    if (fs.existsSync(RULES_FILE)) {
      const data = fs.readFileSync(RULES_FILE, 'utf8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to read rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rules = await req.json();
    
    // Ensure directory exists
    const dir = path.dirname(RULES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save rules" }, { status: 500 });
  }
}