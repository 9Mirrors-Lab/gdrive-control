import { NextResponse } from 'next/server';
import { getContentData } from '@/lib/data';

export async function GET() {
  try {
    const data = getContentData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load content data' }, { status: 500 });
  }
}
