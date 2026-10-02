import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { askAdvisor, validMessages } from '@/modules/advisor/service';
import { assertSameOrigin, enforceRateLimit } from '@/modules/core/security';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, 'ai-chat', 30, 10 * 60 * 1000);
    const body = (await request.json()) as { messages?: unknown };
    const { reply, kind, productIds } = await askAdvisor(validMessages(body.messages));
    return NextResponse.json({ reply, kind, productIds });
  } catch (error) {
    return apiError(error);
  }
}
