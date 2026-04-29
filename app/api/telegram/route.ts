import { NextResponse } from "next/server";

import { getTelegramBotUrl, getTelegramBotUsername, getTelegramWebhookBot, getTelegramWebhookSecret } from "@/lib/telegram-bot";

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
    const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    const expectedSecret = getTelegramWebhookSecret();

    if (!receivedSecret || receivedSecret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized webhook request." }, { status: 401 });
    }

    const update = await request.json();
    const bot = getTelegramWebhookBot();

    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
