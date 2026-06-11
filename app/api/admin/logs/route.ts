import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { query } from '@/lib/db';
import { Log } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with filters
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      conditions.push(`type = $${paramCount++}`);
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);

    const logs = await query<Log>(
      `SELECT * FROM logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      params
    );

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Get logs error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
