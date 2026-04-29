import { NextResponse } from "next/server";
import { z } from "zod";

import { generateScript } from "@/lib/claude";
import { assertTelegramAuth } from "@/lib/telegram-auth";
import { generationTypeConfig } from "@/lib/generation-types";

function optionalText(defaultValue = "") {
  return z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim() || defaultValue);
}

const payloadSchema = z.object({
  type: z.enum(
    Object.keys(generationTypeConfig) as [
      keyof typeof generationTypeConfig,
      ...Array<keyof typeof generationTypeConfig>
    ]
  ),
  data: z.object({
    topic: z.string().trim().min(3),
    niche: optionalText(""),
    audience: optionalText(""),
    tone: optionalText("Энергичный, уверенный"),
    language: z.enum(["ru", "uz", "en"]).default("ru"),
    offer: optionalText(""),
    platform: optionalText("Instagram Reels"),
    duration: optionalText("30-45 секунд"),
    notes: optionalText("")
  })
});

export async function POST(request: Request) {
  try {
    const initData = request.headers.get("x-telegram-init-data");
    assertTelegramAuth(initData, { allowMissing: true });

    const payload = payloadSchema.parse(await request.json());
    const result = await generateScript(payload.type, payload.data);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
