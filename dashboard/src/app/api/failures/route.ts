import { NextResponse } from 'next/server';
import { getFailuresData } from '@/lib/data';

export async function GET() {
  try {
    const data = getFailuresData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load extraction failures' }, { status: 500 });
  }
}
