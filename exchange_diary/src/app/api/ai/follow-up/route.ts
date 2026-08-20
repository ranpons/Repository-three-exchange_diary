import { generateFollowUpQuestion } from "@/lib/ai/diaryAssistant";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MESSAGES = 12;
const MAX_CONTENT_LENGTH = 400;
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 10 * 60 * 1000;

type RateRecord = {
  count: number;
  resetAt: number;
};

const rateRecords = new Map<string, RateRecord>();

function clientIdentifier(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function isRateLimited(identifier: string) {
  const now = Date.now();
  const existing = rateRecords.get(identifier);

  if (!existing || existing.resetAt <= now) {
    rateRecords.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  existing.count += 1;
  return existing.count > RATE_LIMIT;
}

function isChatMessage(value: unknown): value is {
  role: "user" | "assistant";
  content: string;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as { role?: unknown; content?: unknown };
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= MAX_CONTENT_LENGTH
  );
}

export async function POST(request: Request) {
  // ローカル確認モード(Supabase未接続)では投稿機能側と同様に認証を要求しない。
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        { error: "この機能の利用にはログインが必要です。" },
        { status: 401 },
      );
    }
  }

  if (isRateLimited(clientIdentifier(request))) {
    return Response.json(
      { error: "短時間の利用回数が上限に達しました。少し待ってから再試行してください。" },
      { status: 429 },
    );
  }

  try {
    const payload = (await request.json()) as {
      question?: unknown;
      messages?: unknown;
    };

    if (
      typeof payload.question !== "string" ||
      payload.question.trim().length < 1 ||
      payload.question.length > 120 ||
      !Array.isArray(payload.messages) ||
      payload.messages.length < 1 ||
      payload.messages.length > MAX_MESSAGES ||
      !payload.messages.every(isChatMessage)
    ) {
      return Response.json(
        { error: "会話内容の形式が正しくありません。" },
        { status: 400 },
      );
    }

    const reply = await generateFollowUpQuestion({
      baseQuestion: payload.question.trim(),
      messages: payload.messages.map((message) => ({
        role: message.role,
        content: message.content.trim(),
      })),
    });

    return Response.json({ reply });
  } catch (error) {
    console.error("Hugging Face follow-up generation failed", error);
    return Response.json(
      {
        error:
          "AIから返答を受け取れませんでした。APIキーと利用状況を確認してください。",
      },
      { status: 503 },
    );
  }
}
