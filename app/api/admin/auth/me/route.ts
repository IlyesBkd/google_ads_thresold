import { getErrorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { query } from '@/lib/db';
import { Admin } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const payload = await requireAuth(request);

    // Fetch admin details
    const admins = await query<Admin>(
      'SELECT id, email, role, created_at FROM admins WHERE id = $1',
      [payload.adminId]
    );

    const admin = admins[0];

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        createdAt: admin.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || 'Unauthorized' },
      { status: 401 }
    );
  }
}
