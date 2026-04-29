import crypto from "node:crypto";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const explicitSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

if (!botToken) {
  console.error("Missing TELEGRAM_BOT_TOKEN in environment.");
  process.exit(1);
}

if (!appUrl) {
  console.error("Missing NEXT_PUBLIC_APP_URL in environment.");
  process.exit(1);
}

const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram`;
const webhookSecret =
  explicitSecret || crypto.createHash("sha256").update(botToken).digest("hex").slice(0, 32);

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.description || `Telegram ${method} failed.`);
  }

  return payload;
}

try {
  await telegram("setMyCommands", {
    commands: [
      { command: "start", description: "Открыть HOOK" },
      { command: "menu", description: "Показать меню" },
      { command: "help", description: "Как сохранить варианты" },
      { command: "stats", description: "Статистика" }
    ]
  });

  await telegram("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Открыть HOOK",
      web_app: {
        url: appUrl
      }
    }
  });

  const result = await telegram("setWebhook", {
    url: webhookUrl,
    secret_token: webhookSecret,
    allowed_updates: ["message", "callback_query"]
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        webhookUrl,
        webhookSecret,
        description: result.description
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
