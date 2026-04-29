import { NextResponse } from "next/server";

import { getTelegramBotUrl, getTelegramBotUsername, getTelegramWebhookBot } from "@/lib/telegram-bot";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    username: getTelegramBotUsername(),
    url: getTelegramBotUrl()
  });
}

export async function POST(request: Request) {
  try {
    const update = await request.json();
    const bot = getTelegramWebhookBot();

    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
