import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { Admin } from '@/lib/types';
import { adminLoginSchema } from '@/lib/validation';
import { COOKIE_MAX_AGE_SECONDS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Valid email and password are required' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Find admin by email
    const admins = await query<Admin>(
      'SELECT * FROM admins WHERE email = $1 LIMIT 1',
      [email]
    );

    const admin = admins[0];

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    // Log the login
    await query(
      'INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)',
      ['login', `Admin ${admin.email} logged in`, admin.id]
    );

    // Return token with cookie
    const response = NextResponse.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
