import { NextResponse } from 'next/server';
import { asAppError } from './server';

export function apiError(error: unknown) {
  const appError = asAppError(error);
  console.error('API error', appError.status, appError.message);
  return NextResponse.json({ error: appError.message }, { status: appError.status });
}

export function safeJson<T>(request: Request) {
  return request.json() as Promise<T>;
}
