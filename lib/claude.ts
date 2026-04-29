import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import Anthropic from "@anthropic-ai/sdk";

import { buildPrompt, PROMPT_VERSION } from "@/lib/prompts";
import type {
  GenerateResponse,
  GeneratedItem,
  GenerationInput,
  GenerationType
} from "@/lib/generation-types";

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const bedrockRegion =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-north-1";
const bedrockModelId = process.env.BEDROCK_MODEL_ID;
const bedrockMaxTokens = Number.parseInt(process.env.BEDROCK_MAX_TOKENS ?? "32000", 10);

let bedrockClient: BedrockRuntimeClient | null = null;

function extractJSON(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model did not return JSON.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

function parseJsonObject(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = JSON.parse(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("BEDROCK_ADDITIONAL_MODEL_REQUEST_FIELDS must be a JSON object.");
  }

  return parsed;
}

function getBedrockClient() {
  if (!bedrockModelId) {
    return null;
  }

  bedrockClient ??= new BedrockRuntimeClient({ region: bedrockRegion });
  return bedrockClient;
}

function extractBedrockText(
  content: Array<{ text?: string }> | undefined
) {
  if (!content?.length) {
    return "";
  }

  return content
    .map((block) => (typeof block.text === "string" ? block.text : ""))
    .filter(Boolean)
    .join("\n");
}

function buildMockItems(type: GenerationType, data: GenerationInput): GeneratedItem[] {
  const baseHook = {
    harmon: `Ты не обязан снимать чаще, чтобы ${data.topic.toLowerCase()} работал лучше.`,
    classic: `Вот самая простая схема, чтобы раскрыть тему "${data.topic}" без воды.`,
    hooks: `90% роликов про "${data.topic}" теряют внимание в первые 2 секунды.`,
    ads: `Если ${data.audience.toLowerCase()} все еще откладывает ${data.topic.toLowerCase()}, причина обычно одна.`,
    story: `Я понял, что делаю "${data.topic}" неправильно, только когда увидел цифры.`,
    expert: `Главная ошибка в теме "${data.topic}" не в технике, а в логике подачи.`
  }[type];

  return Array.from({ length: type === "hooks" ? 5 : 3 }, (_, index) => ({
    title: `${index + 1}. ${data.niche} / ${data.tone}`,
    hook:
      index === 0
        ? baseHook
        : `${baseHook.replace(".", "")} — вариант ${index + 1}.`,
    script: [
      `Открой ролик через контраст: чего аудитория ожидает и что происходит на самом деле в нише ${data.niche}.`,
      `Быстро назови одну конкретную причину проблемы для аудитории "${data.audience}".`,
      `Покажи короткий инсайт или шаг, который меняет результат по теме "${data.topic}".`,
      `Закрой ролик действием: сохранить, написать в директ или протестировать подход сегодня.`
    ],
    cta: "Сохрани и протестируй этот заход в следующем ролике."
  }));
}

async function generateWithBedrock(
  id: string,
  type: GenerationType,
  data: GenerationInput
): Promise<GenerateResponse> {
  const client = getBedrockClient();

  if (!client || !bedrockModelId) {
    throw new Error("Bedrock is not configured.");
  }

  const additionalModelRequestFields = parseJsonObject(
    process.env.BEDROCK_ADDITIONAL_MODEL_REQUEST_FIELDS
  );
  const { system, user } = buildPrompt(type, data);

  try {
    const response = await client.send(
      new ConverseCommand({
        modelId: bedrockModelId,
        system: [{ text: system }],
        messages: [
          {
            role: "user",
            content: [{ text: user }]
          }
        ],
        inferenceConfig: {
          maxTokens: Number.isFinite(bedrockMaxTokens) ? bedrockMaxTokens : 32000,
          stopSequences: []
        },
        ...(additionalModelRequestFields
          ? { additionalModelRequestFields }
          : {})
      })
    );

    const text = extractBedrockText(
      (response.output?.message?.content as Array<{ text?: string }> | undefined) ?? []
    );
    const parsed = extractJSON(text);
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return {
      id,
      type,
      promptVersion: PROMPT_VERSION,
      source: "bedrock",
      items,
      rawText: text,
      usage: {
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Bedrock error.";
    throw new Error(`Bedrock request failed: ${message}`);
  }
}

export async function generateScript(
  type: GenerationType,
  data: GenerationInput
): Promise<GenerateResponse> {
  const id = crypto.randomUUID();

  if (bedrockModelId) {
    return generateWithBedrock(id, type, data);
  }

  if (!anthropicClient) {
    const mockItems = buildMockItems(type, data);
    return {
      id,
      type,
      promptVersion: PROMPT_VERSION,
      source: "mock",
      items: mockItems,
      rawText: JSON.stringify({ items: mockItems }, null, 2)
    };
  }

  const { system, user } = buildPrompt(type, data);

  const response = await anthropicClient.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: user }]
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const parsed = extractJSON(text);
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return {
    id,
    type,
    promptVersion: PROMPT_VERSION,
    source: "anthropic",
    items,
    rawText: text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  };
}
