import { NextResponse } from 'next/server';
import { getGovernanceMetrics } from '@/lib/data';

export async function GET() {
  try {
    const data = getGovernanceMetrics();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load governance metrics' }, { status: 500 });
  }
}
