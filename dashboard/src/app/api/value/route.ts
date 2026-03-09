import { NextResponse } from 'next/server';
import { getValueData } from '@/lib/data';

export async function GET() {
  try {
    const data = getValueData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load value data' }, { status: 500 });
  }
}
