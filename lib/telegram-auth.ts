import crypto from "node:crypto";

function createSecretKey(botToken: string) {
  return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
}

export function validateTelegramInitData(initData: string, botToken: string) {
  if (!initData) {
    return false;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return false;
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = createSecretKey(botToken);
  const computedHash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  return computedHash === hash;
}

export function assertTelegramAuth(initData: string | null) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  if (!initData || !validateTelegramInitData(initData, botToken)) {
    throw new Error("Telegram auth validation failed.");
  }
}
