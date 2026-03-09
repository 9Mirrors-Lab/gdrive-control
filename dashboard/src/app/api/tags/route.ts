import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RUN_ID = "run_20260306_151014";
const BASE_DIR = `/Volumes/Fulcrum/Develop/gdrive-control/runs/${RUN_ID}`;
const TAGS_FILE = path.join(BASE_DIR, '07-migration', 'tags.json');

export async function GET() {
  try {
    if (fs.existsSync(TAGS_FILE)) {
      const data = fs.readFileSync(TAGS_FILE, 'utf8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json({});
  } catch (error) {
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  try {
    const newTags = await req.json();
    fs.mkdirSync(path.dirname(TAGS_FILE), { recursive: true });
    fs.writeFileSync(TAGS_FILE, JSON.stringify(newTags, null, 2));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
