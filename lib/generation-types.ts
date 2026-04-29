export const generationTypeConfig = {
  harmon: {
    label: "Harmon",
    description: "Крючок + короткий сценарий в сбалансированном тоне."
  },
  classic: {
    label: "Classic",
    description: "Классическая подача для стабильных экспертных роликов."
  },
  hooks: {
    label: "Hooks",
    description: "Серия входных фраз для быстрого теста заходов."
  },
  ads: {
    label: "Ads",
    description: "Продажный сценарий для рекламы и лидогенерации."
  },
  story: {
    label: "Story",
    description: "Повествовательный формат с напряжением и развязкой."
  },
  expert: {
    label: "Expert",
    description: "Авторитетная подача с аргументами и структурой."
  }
} as const;

export type GenerationType = keyof typeof generationTypeConfig;

export type GenerationInput = {
  topic: string;
  niche: string;
  audience: string;
  tone: string;
  language: "ru" | "uz" | "en";
  offer?: string;
  platform?: string;
  duration?: string;
  notes?: string;
};

export type GeneratedItem = {
  hook: string;
  title?: string;
  script: string[];
  cta?: string;
};

export type GenerateResponse = {
  id: string;
  type: GenerationType;
  promptVersion: string;
  source: "mock" | "anthropic" | "bedrock";
  items: GeneratedItem[];
  rawText: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};
