import { NextResponse } from 'next/server';
import { getCollisionsData, getCanonicalSelections } from '@/lib/data';

export async function GET() {
  try {
    const collisions = getCollisionsData();
    const selections = getCanonicalSelections();
    
    // Map canonical decisions to the collision data
    const canonicalSet = new Set();
    if (Array.isArray(selections)) {
      selections.forEach((s: any) => {
        if (s.CanonicalSource) canonicalSet.add(s.CanonicalSource);
      });
    }

    const enriched = (Array.isArray(collisions) ? collisions : []).map((item: any) => ({
      ...item,
      isCanonical: canonicalSet.has(item.Path),
      isRemoved: !canonicalSet.has(item.Path) // Since we just ran the script, non-canonicals are now removed/quarantined
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load collisions data' }, { status: 500 });
  }
}
