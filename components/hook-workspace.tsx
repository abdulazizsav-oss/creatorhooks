"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  Copy,
  Lightning,
  LinkBreak,
  MagicWand,
  Microphone,
  PaperPlaneTilt,
  Pulse,
  Sparkle
} from "@phosphor-icons/react";

import type {
  GenerateResponse,
  GenerationInput,
  GenerationType
} from "@/lib/generation-types";
import { generationTypeConfig } from "@/lib/generation-types";

const typeOrder = Object.keys(generationTypeConfig) as GenerationType[];
const tonePresets = [
  "Энергичный, уверенный",
  "Спокойный, экспертный",
  "Провокационный",
  "Дружелюбный, простой"
] as const;
const quickStartExamples = [
  {
    label: "Фитнес",
    values: {
      topic: "как удерживать клиентов фитнес-клуба",
      niche: "Фитнес",
      audience: "Владельцы клубов",
      tone: "Энергичный, уверенный",
      notes: "Нужны идеи для коротких reels про удержание клиентов и повторные продления."
    }
  },
  {
    label: "Эксперт",
    values: {
      topic: "как эксперту продавать консультации через reels",
      niche: "Личный бренд",
      audience: "Эксперты и наставники",
      tone: "Спокойный, экспертный",
      notes: "Хочу сценарии, которые звучат уверенно, но не как прямой инфобиз-прогрев."
    }
  },
  {
    label: "Салон",
    values: {
      topic: "как салону красоты возвращать клиентов",
      niche: "Beauty",
      audience: "Владельцы салонов",
      tone: "Дружелюбный, простой",
      notes: "Нужны темы для повторных записей, loyalty и удержания."
    }
  }
] as const;

const initialForm: GenerationInput = {
  topic: "",
  niche: "",
  audience: "",
  tone: "Энергичный, уверенный",
  language: "ru",
  offer: "",
  platform: "Instagram Reels",
  duration: "30-45 секунд",
  notes: ""
};

export function HookWorkspace({ botUsername }: { botUsername: string }) {
  const [type, setType] = useState<GenerationType>("harmon");
  const [form, setForm] = useState<GenerationInput>(initialForm);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [isTelegramContext, setIsTelegramContext] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [voiceField, setVoiceField] = useState<"topic" | "notes" | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [microphoneGranted, setMicrophoneGranted] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const canGenerate = form.topic.trim().length >= 3;

  useEffect(() => {
    setIsTelegramContext(Boolean(window.Telegram?.WebApp?.initData));
    setVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stats = useMemo(() => {
    if (!result) {
      return null;
    }

    return [
      {
        label: "Источник",
        value:
          result.source === "mock"
            ? "Demo"
            : result.source === "bedrock"
              ? "Bedrock"
              : "Claude"
      },
      { label: "Версия", value: result.promptVersion },
      { label: "Вариантов", value: String(result.items.length) }
    ];
  }, [result]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": window.Telegram?.WebApp?.initData ?? ""
        },
        body: JSON.stringify({ type, data: form })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось выполнить генерацию.");
      }

      setResult(payload);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Что-то пошло не так.";
      setError(message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error");
    } finally {
      setLoading(false);
    }
  }

  function applyQuickStart(values: Partial<GenerationInput>) {
    setForm((prev) => ({ ...prev, ...values }));
    setError(null);
  }

  function appendVoiceText(field: "topic" | "notes", transcript: string) {
    setForm((prev) => {
      if (field === "topic") {
        return {
          ...prev,
          topic: transcript.trim()
        };
      }

      return {
        ...prev,
        notes: prev.notes ? `${prev.notes.trim()}\n${transcript.trim()}` : transcript.trim()
      };
    });
  }

  function normalizeVoiceErrorCode(error: string) {
    const normalized = error.trim().toLowerCase();

    switch (normalized) {
      case "notallowederror":
      case "permissiondeniederror":
        return "not-allowed";
      case "servicenotallowederror":
        return "service-not-allowed";
      case "audiocaptureerror":
      case "notfounderror":
        return "audio-capture";
      case "networkerror":
        return "network";
      case "nospeecherror":
        return "no-speech";
      case "aborterror":
        return "aborted";
      default:
        return normalized;
    }
  }

  function getVoiceErrorMessage(error: string) {
    switch (normalizeVoiceErrorCode(error)) {
      case "not-allowed":
      case "service-not-allowed":
        return "Браузер не дал доступ к микрофону. Разреши микрофон для этой страницы и попробуй еще раз.";
      case "audio-capture":
        return "Микрофон не найден или недоступен для этой страницы.";
      case "network":
        return "Сервис распознавания речи сейчас недоступен. Попробуй еще раз через пару секунд.";
      case "no-speech":
        return "Не получилось распознать речь. Попробуй говорить чуть ближе к микрофону.";
      case "aborted":
        return "";
      default:
        return "Голосовой ввод сейчас не сработал. Попробуй еще раз или открой страницу в Chrome/Safari.";
    }
  }

  async function ensureMicrophoneAccess() {
    if (microphoneGranted) {
      return true;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneGranted(true);
      return true;
    } catch (accessError) {
      const errorName =
        accessError instanceof DOMException ? accessError.name : "not-allowed";
      setError(getVoiceErrorMessage(errorName));
      return false;
    }
  }

  async function startVoiceInput(field: "topic" | "notes") {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setError("Голосовой ввод не поддерживается в этом браузере.");
      return;
    }

    if (voiceField === field) {
      recognitionRef.current?.stop();
      return;
    }

    recognitionRef.current?.stop();

    const microphoneAvailable = await ensureMicrophoneAccess();

    if (!microphoneAvailable) {
      setVoiceField(null);
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang =
      form.language === "ru" ? "ru-RU" : form.language === "uz" ? "uz-UZ" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        appendVoiceText(field, transcript);
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
      }
    };

    recognition.onerror = (event) => {
      const message = getVoiceErrorMessage(event.error);

      if (message) {
        setError(message);
      }

      setVoiceField(null);
    };

    recognition.onend = () => {
      setVoiceField(null);
      recognitionRef.current = null;
    };

    setVoiceField(field);
    setError(null);

    try {
      recognition.start();
    } catch (startError) {
      const message =
        startError instanceof Error
          ? startError.message
          : "Не удалось запустить голосовой ввод.";
      setError(message);
      setVoiceField(null);
      recognitionRef.current = null;
    }
  }

  async function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "true");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error("Не удалось скопировать текст.");
    }
  }

  function openBot() {
    if (!botUsername) {
      return;
    }

    const url = `https://t.me/${botUsername.replace(/^@/, "")}`;
    const webApp = window.Telegram?.WebApp;

    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(url);
      return;
    }

    if (webApp?.openLink) {
      webApp.openLink(url);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyVariant(id: string, lines: string[]) {
    try {
      await copyText(lines.join("\n"));
    } catch (copyError) {
      const message =
        copyError instanceof Error ? copyError.message : "Не удалось скопировать текст.";
      setError(message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error");
      return;
    }

    setCopiedId(id);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  async function sendVariantToBot(id: string, text: string) {
    try {
      const response = await fetch("/api/telegram/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": window.Telegram?.WebApp?.initData ?? ""
        },
        body: JSON.stringify({
          text,
          telegramUserId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось отправить вариант в бота.");
      }

      setSentId(id);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
      window.setTimeout(() => setSentId(null), 1800);
    } catch (shareError) {
      const message =
        shareError instanceof Error
          ? shareError.message
          : "Не удалось отправить вариант в бота.";
      setError(message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error");
    }
  }

  return (
    <main className="min-h-[100dvh] px-4 py-5 sm:px-6">
      <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-[28px] border border-black/6 bg-white/90 shadow-soft backdrop-blur">
          <div className="border-b border-black/6 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-moss/20 bg-moss/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-moss">
                  <Pulse size={14} weight="fill" />
                  Hook
                </div>
                <div>
                  <h1 className="text-4xl tracking-tight text-ink sm:text-5xl">
                    Сценарии для коротких видео
                  </h1>
                  <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-black/55 sm:text-base">
                    Генерируй hooks, рекламные заходы и экспертные сценарии под свою нишу.
                  </p>
                </div>
              </div>

              <div className="hidden rounded-[24px] border border-black/6 bg-paper px-4 py-3 text-right sm:block">
                <div className="text-[11px] uppercase tracking-[0.18em] text-black/40">MVP</div>
                <div className="mt-2 text-lg tracking-tight">Telegram Mini App</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-5 py-5 sm:px-6">
            {botUsername ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-moss/18 bg-moss/8 px-4 py-4">
                <div>
                  <div className="text-sm font-medium text-ink">Бот подключен</div>
                  <div className="mt-1 text-sm text-black/55">
                    Запусти бота один раз, и варианты можно будет сохранять прямо в Telegram.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openBot}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[18px] border border-black/8 bg-white px-4 py-2 text-sm font-medium text-ink transition duration-200 hover:-translate-y-[1px]"
                >
                  <PaperPlaneTilt size={18} />
                  Открыть @{botUsername.replace(/^@/, "")}
                </button>
              </div>
            ) : null}

            {!isTelegramContext ? (
              <div className="rounded-[20px] border border-black/8 bg-paper/70 px-4 py-3 text-sm leading-relaxed text-black/60">
                Генерация работает и в браузере. Чтобы отправлять варианты прямо в Telegram-бота,
                открой приложение через кнопку в @{botUsername.replace(/^@/, "") || "боте"}.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {quickStartExamples.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => applyQuickStart(example.values)}
                  className="inline-flex min-h-10 items-center rounded-[16px] border border-black/8 bg-white px-4 py-2 text-sm font-medium text-ink transition duration-200 hover:-translate-y-[1px]"
                >
                  {example.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {typeOrder.map((item) => {
                const active = item === type;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setType(item)}
                    className={[
                      "rounded-[22px] border px-4 py-4 text-left transition duration-200",
                      active
                        ? "border-moss bg-moss text-white shadow-soft"
                        : "border-black/6 bg-paper/70 text-ink hover:-translate-y-[1px] hover:border-moss/35"
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-base tracking-tight">
                          {generationTypeConfig[item].label}
                        </div>
                        <p
                          className={[
                            "mt-1 text-sm leading-snug",
                            active ? "text-white/78" : "text-black/55"
                          ].join(" ")}
                        >
                          {generationTypeConfig[item].description}
                        </p>
                      </div>
                      <Sparkle size={18} weight={active ? "fill" : "regular"} />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4">
              <Field label="Тема">
                <div className="grid gap-2">
                  <div className="flex gap-2">
                    <input
                      value={form.topic}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, topic: event.target.value }))
                      }
                      placeholder="Например: как фитнес-клубу удерживать клиентов"
                      className={inputClassName}
                    />
                    {voiceSupported ? (
                      <IconButton
                        label={voiceField === "topic" ? "Остановить запись" : "Надиктовать тему"}
                        active={voiceField === "topic"}
                        onClick={() => void startVoiceInput("topic")}
                        icon={
                          <Microphone
                            size={18}
                            weight={voiceField === "topic" ? "fill" : "regular"}
                          />
                        }
                      />
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-black/48">
                    Достаточно одной темы. Остальное можно заполнить позже или не трогать вообще.
                  </p>
                  {voiceSupported ? (
                    <p className="text-sm leading-relaxed text-black/42">
                      При первом запуске браузер может попросить доступ к микрофону.
                    </p>
                  ) : null}
                </div>
              </Field>

              <Field label="Тон">
                <div className="flex flex-wrap gap-2">
                  {tonePresets.map((tone) => {
                    const active = form.tone === tone;

                    return (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, tone }))}
                        className={[
                          "inline-flex min-h-10 items-center rounded-[16px] border px-4 py-2 text-sm font-medium transition duration-200 hover:-translate-y-[1px]",
                          active
                            ? "border-moss bg-moss text-white"
                            : "border-black/8 bg-white text-ink"
                        ].join(" ")}
                      >
                        {tone}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Платформа">
                  <select
                    value={form.platform}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, platform: event.target.value }))
                    }
                    className={inputClassName}
                  >
                    <option>Instagram Reels</option>
                    <option>TikTok</option>
                    <option>YouTube Shorts</option>
                    <option>Telegram video</option>
                  </select>
                </Field>

                <Field label="Язык">
                  <select
                    value={form.language}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        language: event.target.value as GenerationInput["language"]
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="ru">Русский</option>
                    <option value="uz">O'zbekcha</option>
                    <option value="en">English</option>
                  </select>
                </Field>
              </div>

              <Field label="Контекст">
                <div className="grid gap-2">
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Расскажи суть задачи, продукт, боль клиента, запретные слова, примеры."
                    rows={5}
                    className={`${inputClassName} resize-none`}
                  />
                  {voiceSupported ? (
                    <div className="flex justify-end">
                      <IconButton
                        label={voiceField === "notes" ? "Остановить запись" : "Надиктовать контекст"}
                        active={voiceField === "notes"}
                        onClick={() => void startVoiceInput("notes")}
                        icon={
                          <Microphone
                            size={18}
                            weight={voiceField === "notes" ? "fill" : "regular"}
                          />
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </Field>

              <div className="rounded-[20px] border border-black/8 bg-white/70 p-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left text-sm font-medium text-ink"
                >
                  <span>Доп. настройки</span>
                  <span className="text-black/45">{showAdvanced ? "Скрыть" : "Показать"}</span>
                </button>

                {showAdvanced ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Ниша">
                      <input
                        value={form.niche}
                        onChange={(event) => setForm((prev) => ({ ...prev, niche: event.target.value }))}
                        placeholder="Фитнес, travel, косметология"
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Аудитория">
                      <input
                        value={form.audience}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, audience: event.target.value }))
                        }
                        placeholder="Владельцы бизнеса, молодые мамы, эксперты"
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Оффер">
                      <input
                        value={form.offer}
                        onChange={(event) => setForm((prev) => ({ ...prev, offer: event.target.value }))}
                        placeholder="Что нужно продать или продвинуть"
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Длительность">
                      <input
                        value={form.duration}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, duration: event.target.value }))
                        }
                        placeholder="15-20 секунд"
                        className={inputClassName}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="rounded-[20px] border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-ink">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={loading || !canGenerate}
                onClick={handleGenerate}
                className="inline-flex min-h-12 items-center gap-2 rounded-[18px] bg-ink px-5 py-3 text-sm font-medium text-white transition duration-200 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? <ArrowClockwise size={18} className="animate-spin" /> : <MagicWand size={18} />}
                {loading ? "Генерирую" : "Сгенерировать"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setResult(null);
                  setError(null);
                }}
                className="inline-flex min-h-12 items-center gap-2 rounded-[18px] border border-black/8 bg-white px-5 py-3 text-sm font-medium text-ink transition duration-200 hover:-translate-y-[1px]"
              >
                <LinkBreak size={18} />
                Очистить
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-[28px] border border-black/6 bg-ink px-5 py-5 text-white shadow-soft sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Result Feed
                </div>
                <h2 className="mt-2 text-2xl tracking-tight">Готовые варианты</h2>
              </div>
              <Lightning size={20} weight="fill" className="text-clay" />
            </div>

            {stats ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                      {item.label}
                    </div>
                    <div className="mt-2 text-base tracking-tight">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-white/14 bg-white/[0.03] px-5 py-8 text-sm leading-relaxed text-white/62">
                Здесь появятся готовые hooks и сценарии после генерации.
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {loading
              ? Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="rounded-[28px] border border-black/6 bg-white/80 p-5 shadow-soft"
                  >
                    <div className="h-4 w-28 animate-pulse rounded-full bg-black/8" />
                    <div className="mt-4 h-8 w-5/6 animate-pulse rounded-full bg-black/8" />
                    <div className="mt-6 space-y-3">
                      <div className="h-4 w-full animate-pulse rounded-full bg-black/8" />
                      <div className="h-4 w-[92%] animate-pulse rounded-full bg-black/8" />
                      <div className="h-4 w-[84%] animate-pulse rounded-full bg-black/8" />
                    </div>
                  </div>
                ))
              : result?.items.map((item, index) => {
                  const lines = [
                    item.title || `Вариант ${index + 1}`,
                    "",
                    `Hook: ${item.hook}`,
                    "",
                    ...item.script.map((line, lineIndex) => `${lineIndex + 1}. ${line}`),
                    item.cta ? `\nCTA: ${item.cta}` : ""
                  ].filter(Boolean);

                  const copyKey = `${result.id}-${index}`;

                  return (
                    <article
                      key={copyKey}
                      className="rounded-[28px] border border-black/6 bg-white/92 p-5 shadow-soft"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-black/40">
                            Вариант {index + 1}
                          </div>
                          <h3 className="mt-2 text-2xl tracking-tight text-ink">{item.hook}</h3>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyVariant(copyKey, lines)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-[16px] border border-black/8 bg-paper px-4 py-2 text-sm font-medium text-ink transition duration-200 hover:-translate-y-[1px]"
                        >
                          <Copy size={18} />
                          Скопировать
                        </button>

                        {botUsername ? (
                          <button
                            type="button"
                            onClick={() => sendVariantToBot(copyKey, lines.join("\n"))}
                            disabled={!isTelegramContext}
                            className="inline-flex min-h-11 items-center gap-2 rounded-[16px] border border-moss/18 bg-moss/8 px-4 py-2 text-sm font-medium text-ink transition duration-200 hover:-translate-y-[1px]"
                          >
                            <PaperPlaneTilt size={18} />
                            В бот
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-5 grid gap-3">
                        {item.script.map((step, stepIndex) => (
                          <div
                            key={stepIndex}
                            className="rounded-[20px] border border-black/6 bg-paper/75 px-4 py-3"
                          >
                            <div className="text-[11px] uppercase tracking-[0.18em] text-black/38">
                              Beat {stepIndex + 1}
                            </div>
                            <div className="mt-2 text-sm leading-relaxed text-ink">{step}</div>
                          </div>
                        ))}
                      </div>

                      {item.cta ? (
                        <div className="mt-5 rounded-[20px] border border-moss/18 bg-moss/8 px-4 py-3 text-sm text-ink">
                          {item.cta}
                        </div>
                      ) : null}

                      {copiedId === copyKey ? (
                        <div className="mt-3 text-sm text-moss">Скопировано.</div>
                      ) : null}

                      {sentId === copyKey ? (
                        <div className="mt-3 text-sm text-moss">Отправлено в бота.</div>
                      ) : null}
                    </article>
                  );
                })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-black/58">{label}</span>
      {children}
    </label>
  );
}

function IconButton({
  label,
  icon,
  active,
  onClick
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border transition duration-200",
        active
          ? "border-moss bg-moss text-white"
          : "border-black/8 bg-white text-ink hover:-translate-y-[1px]"
      ].join(" ")}
    >
      {icon}
    </button>
  );
}

const inputClassName =
  "min-h-12 rounded-[18px] border border-black/8 bg-paper/70 px-4 py-3 text-sm text-ink outline-none transition duration-200 placeholder:text-black/30 focus:border-moss";
