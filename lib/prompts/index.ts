import { generationTypeConfig, type GenerationInput, type GenerationType } from "@/lib/generation-types";

export const PROMPT_VERSION = "v1.2";

const responseContract = [
  "Верни JSON без markdown.",
  'Формат: {"items":[{"title":"...","hook":"...","script":["...","..."],"cta":"..."}]}',
  "script должен быть массивом из 4-7 коротких сцен или смысловых блоков.",
  "hook должен быть сильным первым предложением до 18 слов.",
  "Каждый текст должен звучать естественно для короткого видео."
].join(" ");

export function buildPrompt(type: GenerationType, data: GenerationInput) {
  const niche = data.niche?.trim() || "не указана";
  const audience = data.audience?.trim() || "не указана";
  const tone = data.tone?.trim() || "Энергичный, уверенный";
  const platform = data.platform?.trim() || "Instagram Reels / TikTok";
  const duration = data.duration?.trim() || "30-45 секунд";

  const baseContext = [
    `Тип генерации: ${generationTypeConfig[type].label}.`,
    `Тема: ${data.topic}.`,
    `Ниша: ${niche}.`,
    `Аудитория: ${audience}.`,
    `Тон: ${tone}.`,
    `Язык ответа: ${data.language}.`,
    `Платформа: ${platform}.`,
    `Хронометраж: ${duration}.`,
    data.offer ? `Оффер: ${data.offer}.` : null,
    data.notes ? `Доп. контекст: ${data.notes}.` : null
  ]
    .filter(Boolean)
    .join(" ");

  const systems: Record<GenerationType, string> = {
    harmon:
      "Ты senior short-form strategist. Пишешь сбалансированные hooks и сценарии, где провокация сочетается с доверием.",
    classic:
      "Ты copywriter для коротких экспертных видео. Создаешь чистую, понятную, надежную структуру без лишнего драматизма.",
    hooks:
      "Ты viral hook specialist. Твоя задача — выдавать несколько сильных заходов, которые сразу цепляют взгляд и удерживают внимание.",
    ads:
      "Ты direct-response video strategist. Пишешь тексты, которые быстро выявляют боль, усиливают желание и приводят к CTA.",
    story:
      "Ты сценарист коротких историй для Reels. Строишь драматургию через контраст, поворот и эмоциональный payoff.",
    expert:
      "Ты экспертный ghostwriter для личного бренда. Делаешь речь уверенной, конкретной и содержательной."
  };

  const typeInstruction: Record<GenerationType, string> = {
    harmon: "Сделай 3 варианта. Балансируй эмоцию и полезность.",
    classic: "Сделай 3 варианта. Основа — ясность, структура и чистый вывод.",
    hooks: "Сделай 5 вариантов. У каждого варианта hook должен сильно отличаться по углу входа.",
    ads: "Сделай 3 варианта. Добавь боль, обещание результата и понятный следующий шаг.",
    story: "Сделай 3 варианта. В каждом нужен конфликт, развитие и развязка.",
    expert: "Сделай 3 варианта. Усиль ощущение компетентности и практической пользы."
  };

  return {
    system: `${systems[type]} ${responseContract}`,
    user: `${baseContext} ${typeInstruction[type]}`
  };
}
