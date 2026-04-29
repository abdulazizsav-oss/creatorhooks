import { NextResponse } from "next/server";
import { z } from "zod";

import { generateScript } from "@/lib/claude";
import { assertTelegramAuth } from "@/lib/telegram-auth";
import { generationTypeConfig } from "@/lib/generation-types";

const payloadSchema = z.object({
  type: z.enum(Object.keys(generationTypeConfig) as [keyof typeof generationTypeConfig, ...Array<keyof typeof generationTypeConfig>]),
  data: z.object({
    topic: z.string().min(3),
    niche: z.string().min(2),
    audience: z.string().min(2),
    tone: z.string().min(2),
    language: z.enum(["ru", "uz", "en"]),
    offer: z.string().optional(),
    platform: z.string().optional(),
    duration: z.string().optional(),
    notes: z.string().optional()
  })
});

export async function POST(request: Request) {
  try {
    const initData = request.headers.get("x-telegram-init-data");
    assertTelegramAuth(initData);

    const payload = payloadSchema.parse(await request.json());
    const result = await generateScript(payload.type, payload.data);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
