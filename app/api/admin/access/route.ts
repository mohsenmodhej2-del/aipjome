import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { accessOverview, changeAccess } from '@/modules/access/service';
import { assertSameOrigin } from '@/modules/core/security';
import { requireUser } from '@/modules/identity/service';

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await accessOverview(await requireUser(request))); }
  catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); const user = await requireUser(request); const result = await changeAccess(user, await safeJson(request)); return NextResponse.json(result, { status: 'id' in result ? 201 : 200 }); }
  catch (error) { return apiError(error); }
}
