import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { askAdvisor, assertBotSecret, validMessages } from '@/modules/advisor/service';
import { enforceKeyRateLimit } from '@/modules/core/security';

// Used by scripts/bale-bot.mjs; each Bale chat gets its own rate limit.
export async function POST(request: NextRequest) {
  try {
    assertBotSecret(request.headers.get('x-bot-secret'));
    const body = (await request.json()) as { chatId?: string | number; messages?: unknown };
    await enforceKeyRateLimit(`bale-chat:${String(body.chatId ?? 'unknown').slice(0, 40)}`, 20, 10 * 60 * 1000);
    return NextResponse.json(await askAdvisor(validMessages(body.messages)));
  } catch (error) {
    return apiError(error);
  }
}
