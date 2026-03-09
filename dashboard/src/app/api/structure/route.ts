import { NextResponse } from 'next/server';
import { getStructureData } from '@/lib/data';

export async function GET() {
  try {
    const data = getStructureData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load structure data' }, { status: 500 });
  }
}
