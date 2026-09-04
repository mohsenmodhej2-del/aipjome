import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { publicProduct } from '@/modules/catalog/service';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await publicProduct(id));
  } catch (error) { return apiError(error); }
}
