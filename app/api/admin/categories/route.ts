import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { changeCategory } from '@/modules/catalog/categories';
import { assertSameOrigin } from '@/modules/core/security';
import { requireUser } from '@/modules/identity/service';

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); const result = await changeCategory(await requireUser(request), await safeJson(request)); return NextResponse.json(result, { status: 'id' in result ? 201 : 200 }); }
  catch (error) { return apiError(error); }
}
