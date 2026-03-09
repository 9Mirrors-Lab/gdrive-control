import { NextResponse } from 'next/server';
import { saveApproval } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;
    
    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }
    
    const result = saveApproval(type, data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save approval' }, { status: 500 });
  }
}
