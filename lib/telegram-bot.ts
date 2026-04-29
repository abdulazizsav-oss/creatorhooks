import { Telegraf } from "telegraf";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

let bot: Telegraf | null = null;

type InlineButton = {
  text: string;
} & (
  | {
      url: string;
    }
  | {
      web_app: {
        url: string;
      };
    }
);

function ensureBotToken() {
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  return botToken;
}

export function getTelegramBotUsername() {
  return botUsername;
}

export function getTelegramBotUrl() {
  if (!botUsername) {
    return "";
  }

  return `https://t.me/${botUsername}`;
}

function buildOpenAppButton() {
  if (!appUrl) {
    return [] as InlineButton[][];
  }

  return [
    [
      {
        text: "Открыть HOOK",
        web_app: {
          url: appUrl
        }
      }
    ]
  ];
}

function buildBotReplyMarkup() {
  const inlineKeyboard: InlineButton[][] = [...buildOpenAppButton()];

  if (getTelegramBotUrl()) {
    inlineKeyboard.push([
      {
        text: "Открыть бота",
        url: getTelegramBotUrl()
      }
    ]);
  }

  return inlineKeyboard.length > 0
    ? {
        inline_keyboard: inlineKeyboard
      }
    : undefined;
}

function buildWelcomeMessage() {
  if (appUrl) {
    return [
      "HOOK готов.",
      "",
      "1. Нажми «Открыть HOOK»",
      "2. Сгенерируй варианты",
      "3. Из Mini App можно сохранить понравившийся вариант прямо в этот бот"
    ].join("\n");
  }

  return [
    "HOOK готов.",
    "",
    "После деплоя укажи NEXT_PUBLIC_APP_URL, и здесь появится кнопка открытия Mini App."
  ].join("\n");
}

export function getTelegramWebhookBot() {
  if (bot) {
    return bot;
  }

  const instance = new Telegraf(ensureBotToken());

  instance.start(async (ctx) => {
    await ctx.reply(buildWelcomeMessage(), {
      reply_markup: buildBotReplyMarkup()
    });
  });

  instance.command("menu", async (ctx) => {
    await ctx.reply("Команды HOOK:", {
      reply_markup: {
        keyboard: [
          [{ text: "/start" }, { text: "/help" }],
          [{ text: "/stats" }]
        ],
        resize_keyboard: true
      }
    });
  });

  instance.command("help", async (ctx) => {
    await ctx.reply(
      "Запусти Mini App, сгенерируй вариант и отправь его в бот кнопкой внутри приложения."
    );
  });

  instance.command("stats", async (ctx) => {
    await ctx.reply("Статистика появится после подключения базы и истории генераций.");
  });

  instance.on("message", async (ctx) => {
    await ctx.reply("Нажми /start, чтобы открыть HOOK и сохранять варианты в этот чат.", {
      reply_markup: buildBotReplyMarkup()
    });
  });

  bot = instance;
  return instance;
}

function splitMessage(text: string, maxLength = 3500) {
  const parts: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf("\n", maxLength);

    if (splitAt < 500) {
      splitAt = maxLength;
    }

    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts;
}

export async function sendTextToTelegramUser(chatId: number, text: string) {
  const token = ensureBotToken();
  const parts = splitMessage(text);

  for (const part of parts) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: part,
        disable_web_page_preview: true
      })
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      description?: string;
    };

    if (!response.ok || payload.ok === false) {
      if (payload.description?.includes("bot can't initiate conversation")) {
        throw new Error("Сначала открой бота и нажми Start, потом отправь вариант еще раз.");
      }

      throw new Error(payload.description || "Telegram sendMessage failed.");
    }
  }
}
