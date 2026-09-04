import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { requireUser } from '@/modules/identity/service';
import { invoiceFor } from '@/modules/invoices/service';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    return NextResponse.json({ invoice: await invoiceFor(user, id) });
  } catch (error) {
    return apiError(error);
  }
}
