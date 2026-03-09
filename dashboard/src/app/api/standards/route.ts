import { NextResponse } from 'next/server';
import { getStandardsViolations } from '@/lib/data';

export async function GET() {
  try {
    const data = getStandardsViolations();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load standards violations' }, { status: 500 });
  }
}
