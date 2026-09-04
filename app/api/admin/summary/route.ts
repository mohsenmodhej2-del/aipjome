import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { managementDashboard } from '@/modules/dashboard/service';
import { requireUser } from '@/modules/identity/service';

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await managementDashboard(await requireUser(request))); }
  catch (error) { return apiError(error); }
}
