import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { publicCatalog } from '@/modules/catalog/service';

export async function GET() {
  try {
    return NextResponse.json(await publicCatalog());
  } catch (error) {
    return apiError(error);
  }
}
