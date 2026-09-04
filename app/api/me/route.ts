import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { currentUser, publicUser } from '@/modules/identity/service';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ user: publicUser(await currentUser(request)) });
  } catch (error) {
    return apiError(error);
  }
}
