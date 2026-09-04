import { NextRequest, NextResponse } from 'next/server';
import { apiError, safeJson } from '@/lib/api';
import { assertSameOrigin } from '@/modules/core/security';
import { requireUser } from '@/modules/identity/service';
import { createProduct } from '@/modules/catalog/service';

type ProductBody = { categoryId?: string; title?: string; description?: string; price?: number; stock?: number };

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    return NextResponse.json(await createProduct(user, await safeJson<ProductBody>(request)), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
