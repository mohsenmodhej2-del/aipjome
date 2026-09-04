import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { getSessionUser, publicUser } from '@/lib/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ user: publicUser(await getSessionUser(request)) });
  } catch (error) {
    return apiError(error);
  }
}
