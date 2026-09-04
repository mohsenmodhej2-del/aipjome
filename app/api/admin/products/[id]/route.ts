import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { updateProduct, type UpdateProduct } from '@/modules/catalog/service';
import { assertSameOrigin } from '@/modules/core/security';
import { requireUser } from '@/modules/identity/service';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const { id } = await context.params; await updateProduct(await requireUser(request), id, await safeJson<UpdateProduct>(request)); return NextResponse.json({ ok: true }); }
  catch (error) { return apiError(error); }
}
