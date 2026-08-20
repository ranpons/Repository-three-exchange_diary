import "server-only";

export type DiaryChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const HUGGING_FACE_ENDPOINT =
  "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b:cheapest";
const FALLBACK_QUESTIONS = [
  "今日の中で、一番心が動いた瞬間は何でしたか？",
  "最近、時間を忘れて楽しんだことは何ですか？",
  "今よく聴いている音楽や好きなジャンルは何ですか？",
  "この一週間で、誰かに伝えたくなった出来事は何ですか？",
  "最近見つけた、小さなお気に入りを教えてください。",
  "今、もう一度やってみたいと思っていることは何ですか？",
  "今日の自分に一つだけ言葉をかけるなら、何と言いますか？",
];

type HuggingFaceResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export function isDiaryAiConfigured() {
  return Boolean(process.env.HUGGINGFACE_API_KEY);
}

export function fallbackQuestionFor(date: string) {
  const dateNumber = Number(date.replaceAll("-", ""));
  return FALLBACK_QUESTIONS[dateNumber % FALLBACK_QUESTIONS.length];
}

function cleanQuestion(value: string, fallback: string) {
  const withoutThinking = value.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const firstLine = withoutThinking
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const cleaned = (firstLine ?? "")
    .replace(/^(質問|今日の質問)\s*[:：]\s*/u, "")
    .replace(/^[「『"']|[」』"']$/gu, "")
    .trim();

  if (cleaned.length < 8 || cleaned.length > 100) {
    return fallback;
  }

  const withQuestionMark = /[？?]$/u.test(cleaned) ? cleaned : `${cleaned}？`;
  return withQuestionMark.slice(0, 100);
}

async function requestChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens: number,
) {
  const token = process.env.HUGGINGFACE_API_KEY;

  if (!token) {
    throw new Error("HUGGINGFACE_API_KEY is not configured");
  }

  const response = await fetch(HUGGING_FACE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.HUGGINGFACE_MODEL ?? DEFAULT_MODEL,
      messages,
      max_tokens: maxTokens,
      reasoning_effort: "low",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  const payload = (await response.json()) as HuggingFaceResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `Hugging Face request failed: ${response.status}`,
    );
  }

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Hugging Face returned an empty response");
  }

  return content;
}

export async function generateDiaryQuestion({
  date,
  recentQuestions,
}: {
  date: string;
  recentQuestions: string[];
}) {
  const fallback = fallbackQuestionFor(date);

  if (!isDiaryAiConfigured()) {
    return { text: fallback, source: "fallback" as const };
  }

  const recentList =
    recentQuestions.length > 0
      ? recentQuestions.map((question) => `- ${question}`).join("\n")
      : "なし";

  try {
    const content = await requestChatCompletion(
      [
        {
          role: "system",
          content:
            "あなたは匿名交換日記の質問作成者です。日本語で、誰でも短く答え始められ、少し考えるとその人らしさが出る質問を一つだけ作ってください。日常、趣味、好きなもの、嬉しかったこと、印象に残ったことを中心にします。本名、住所、学校、職場、連絡先、SNS、病気、犯罪、性的内容、政治、宗教など、個人特定やセンシティブ情報を求めてはいけません。質問文だけを一文で出力し、説明、番号、引用符は付けないでください。",
        },
        {
          role: "user",
          content: `日付: ${date}\n直近の質問とは違う内容にしてください。\n\n直近の質問:\n${recentList}`,
        },
      ],
      256,
    );

    return {
      text: cleanQuestion(content, fallback),
      source: "ai" as const,
    };
  } catch (error) {
    console.error("Hugging Face daily question generation failed", error);
    return { text: fallback, source: "fallback" as const };
  }
}

export async function generateFollowUpQuestion({
  baseQuestion,
  messages,
}: {
  baseQuestion: string;
  messages: DiaryChatMessage[];
}) {
  const fallback = "その中で、特に印象に残っている場面はどこですか？";
  const content = await requestChatCompletion(
    [
      {
        role: "system",
        content:
          "あなたは匿名交換日記を書く人を手伝う聞き手です。相手の直前の回答を受けて、思い出や気持ちを自然に掘り下げる短い質問を日本語で一つだけ返してください。一度に複数の質問をせず、感想や長い説明も付けません。本名、固有の場所、住所、学校、職場、連絡先、SNSなど、個人を特定できる情報は尋ねません。「誰と」と聞きたい場合は「どんな関係の人と」のように、名前を求めない表現にしてください。相手が個人情報を書いても、その情報を回答内で繰り返さないでください。",
      },
      {
        role: "user",
        content: `最初の質問は「${baseQuestion}」です。以下の会話を踏まえ、次の掘り下げ質問を一つだけ返してください。`,
      },
      ...messages,
    ],
    256,
  );

  return cleanQuestion(content, fallback);
}
