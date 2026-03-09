import { NextResponse } from 'next/server';
import { getInventoryData } from '@/lib/data';

export async function GET() {
  try {
    const data = getInventoryData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load inventory data' }, { status: 500 });
  }
}
