/**
 * JWT utilities for admin authentication
 */

import { SignJWT, jwtVerify } from 'jose';
import { JWT_EXPIRATION } from './constants';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface JWTPayload {
  adminId: string;
  email: string;
  role: string;
}

/**
 * Sign a JWT token with admin data
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secret);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie
 */
export function getTokenFromRequest(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookies = request.headers.get('Cookie');
  if (cookies) {
    const match = cookies.match(/admin_token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

/**
 * Middleware to verify admin authentication
 */
export async function requireAuth(request: Request): Promise<JWTPayload> {
  const token = getTokenFromRequest(request);

  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const payload = await verifyToken(token);

  if (!payload) {
    throw new Error('Unauthorized: Invalid token');
  }

  return payload;
}
