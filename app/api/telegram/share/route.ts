import { NextResponse } from "next/server";
import { z } from "zod";

import { sendTextToTelegramUser } from "@/lib/telegram-bot";
import { assertTelegramAuth, getTelegramUserFromInitData } from "@/lib/telegram-auth";

const payloadSchema = z.object({
  text: z.string().min(1),
  telegramUserId: z.number().int().positive().optional()
});

export async function POST(request: Request) {
  try {
    const initData = request.headers.get("x-telegram-init-data");
    const payload = payloadSchema.parse(await request.json());

    if (process.env.NODE_ENV === "production") {
      assertTelegramAuth(initData);
    }

    const telegramUser = getTelegramUserFromInitData(initData);
    const chatId =
      telegramUser?.id ??
      (process.env.NODE_ENV !== "production" ? payload.telegramUserId : undefined);

    if (!chatId) {
      throw new Error("Открой приложение внутри Telegram Mini App, чтобы сохранить вариант в боте.");
    }

    await sendTextToTelegramUser(chatId, payload.text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
