import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    plan: "free",
    usage: {
      usedToday: 0,
      dailyLimit: 3
    }
  });
}
