import { NextResponse } from 'next/server';
import { normalizeError } from '@/modules/core/errors';

export function apiError(error: unknown) {
  const appError = normalizeError(error);
  console.error('API error', appError.status, appError.message);
  return NextResponse.json({ error: appError.message }, { status: appError.status });
}

export function safeJson<T>(request: Request) {
  return request.json() as Promise<T>;
}
