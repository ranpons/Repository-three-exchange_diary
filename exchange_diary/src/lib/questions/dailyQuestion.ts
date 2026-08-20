import "server-only";

import { randomUUID } from "crypto";

import {
  generateDiaryQuestion,
  isDiaryAiConfigured,
} from "@/lib/ai/diaryAssistant";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type DailyQuestion = {
  id: string;
  text: string;
  source: "ai" | "fallback" | "manual";
  notice?: string;
};

const DEVELOPMENT_QUESTION_ID = "11111111-1111-4111-8111-111111111111";
const DEVELOPMENT_QUESTION = "今日、心に残ったことを一つだけ教えてください。";

let demoQuestion:
  | {
      date: string;
      value: Promise<DailyQuestion>;
    }
  | undefined;

function dateInJapan() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function createDemoQuestion(date: string): Promise<DailyQuestion> {
  const generated = await generateDiaryQuestion({ date, recentQuestions: [] });
  return {
    id: DEVELOPMENT_QUESTION_ID,
    text: generated.text,
    source: generated.source,
    notice: isDiaryAiConfigured()
      ? "質問はAIで生成しました。デモモードではサーバー再起動後に変わる場合があります。"
      : "HUGGINGFACE_API_KEY未設定のため、固定候補から質問を選んでいます。",
  };
}

async function getDemoQuestion(date: string) {
  if (!demoQuestion || demoQuestion.date !== date) {
    demoQuestion = { date, value: createDemoQuestion(date) };
  }

  return demoQuestion.value;
}

export async function getDailyQuestion(): Promise<DailyQuestion> {
  const date = dateInJapan();

  if (!isSupabaseConfigured()) {
    return getDemoQuestion(date);
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      id: DEVELOPMENT_QUESTION_ID,
      text: DEVELOPMENT_QUESTION,
      source: "manual",
      notice:
        "日次AI質問をSupabaseへ保存するには、サーバー専用のSUPABASE_SECRET_KEYが必要です。",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("questions")
    .select("id, body, source")
    .eq("question_date", date)
    .maybeSingle();

  if (existingError) {
    console.error("Supabase daily question read failed", {
      code: existingError.code,
      message: existingError.message,
      details: existingError.details,
      hint: existingError.hint,
    });

    const developmentNotice =
      process.env.NODE_ENV === "development"
        ? `Supabase接続エラー（${existingError.code || "UNKNOWN"}）: ${existingError.message}`
        : "今日の質問を取得できませんでした。管理者へ連絡してください。";

    return {
      id: DEVELOPMENT_QUESTION_ID,
      text: DEVELOPMENT_QUESTION,
      source: "manual",
      notice: developmentNotice,
    };
  }

  if (existing) {
    return {
      id: existing.id as string,
      text: existing.body as string,
      source:
        existing.source === "ai" || existing.source === "fallback"
          ? existing.source
          : "manual",
    };
  }

  const { data: recent } = await supabase
    .from("questions")
    .select("body")
    .not("question_date", "is", null)
    .order("question_date", { ascending: false })
    .limit(7);
  const generated = await generateDiaryQuestion({
    date,
    recentQuestions: (recent ?? []).map((row) => row.body as string),
  });
  const id = randomUUID();
  const { data: inserted, error: insertError } = await supabase
    .from("questions")
    .insert({
      id,
      body: generated.text,
      question_date: date,
      source: generated.source,
      status: "open",
    })
    .select("id, body, source")
    .single();

  if (!insertError && inserted) {
    return {
      id: inserted.id as string,
      text: inserted.body as string,
      source: inserted.source as "ai" | "fallback",
    };
  }

  if (insertError) {
    console.error("Supabase daily question insert failed", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    });
  }

  // Another request may have created today's row while the AI was responding.
  const { data: concurrent } = await supabase
    .from("questions")
    .select("id, body, source")
    .eq("question_date", date)
    .single();

  if (concurrent) {
    return {
      id: concurrent.id as string,
      text: concurrent.body as string,
      source:
        concurrent.source === "ai" || concurrent.source === "fallback"
          ? concurrent.source
          : "manual",
    };
  }

  return {
    id: DEVELOPMENT_QUESTION_ID,
    text: DEVELOPMENT_QUESTION,
    source: "manual",
    notice: "今日の質問を保存できなかったため、開発用の質問を表示しています。",
  };
}
