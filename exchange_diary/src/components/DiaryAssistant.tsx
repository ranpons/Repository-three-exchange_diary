"use client";

import { useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type DiaryAssistantProps = {
  enabled: boolean;
  question: string;
  onUseDraft: (draft: string) => void;
};

const MAX_ANSWER_LENGTH = 300;
const MAX_USER_TURNS = 6;

function messageId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `message-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function DiaryAssistant({
  enabled,
  question,
  onUseDraft,
}: DiaryAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "initial-question", role: "assistant", content: question },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [draftAdded, setDraftAdded] = useState(false);

  const userMessages = messages.filter((message) => message.role === "user");
  const reachedTurnLimit = userMessages.length >= MAX_USER_TURNS;
  const canSend =
    enabled && input.trim().length > 0 && !isSending && !reachedTurnLimit;

  async function sendAnswer() {
    const answer = input.trim();

    if (!canSend || !answer) {
      return;
    }

    const nextMessage: ChatMessage = {
      id: messageId(),
      role: "user",
      content: answer,
    };
    const nextMessages = [...messages, nextMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setDraftAdded(false);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = (await response.json()) as {
        reply?: string;
        error?: string;
      };

      if (!response.ok || !payload.reply) {
        throw new Error(payload.error ?? "AIから返答を受け取れませんでした。");
      }

      setMessages((current) => [
        ...current,
        { id: messageId(), role: "assistant", content: payload.reply as string },
      ]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "AIから返答を受け取れませんでした。",
      );
    } finally {
      setIsSending(false);
    }
  }

  function addAnswersToDiary() {
    const draft = userMessages.map((message) => message.content).join("\n\n");

    if (!draft) {
      return;
    }

    onUseDraft(draft);
    setDraftAdded(true);
  }

  return (
    <details className="assistant-panel">
      <summary>AIと話しながら日記を考える（任意）</summary>
      <div className="assistant-content">
        <p className="assistant-privacy">
          会話内容はAIへ送信されます。本名、学校・職場、住所、連絡先、SNSなどは入力しないでください。日記として送信するまではSupabaseへ保存されません。
        </p>

        {!enabled && (
          <p className="assistant-disabled">
            AI接続は未設定です。`.env.local`へHUGGINGFACE_API_KEYを設定すると利用できます。
          </p>
        )}

        <div className="chat-log" aria-live="polite">
          {messages.map((message) => (
            <div
              className={`chat-message chat-message-${message.role}`}
              key={message.id}
            >
              <span>{message.role === "assistant" ? "AI" : "あなた"}</span>
              <p>{message.content}</p>
            </div>
          ))}
          {isSending && (
            <div className="chat-message chat-message-assistant">
              <span>AI</span>
              <p>次の質問を考えています...</p>
            </div>
          )}
        </div>

        {error && (
          <p className="assistant-error" role="alert">
            {error}
          </p>
        )}

        <div className="assistant-input-row">
          <label className="field-label" htmlFor="assistant-answer">
            AIへの回答
          </label>
          <textarea
            id="assistant-answer"
            className="assistant-input"
            value={input}
            maxLength={MAX_ANSWER_LENGTH}
            placeholder="短い回答から始められます。"
            disabled={!enabled || isSending || reachedTurnLimit}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
          />
          <div className="assistant-input-meta">
            <span>
              {userMessages.length} / {MAX_USER_TURNS}回
            </span>
            <span>
              {input.length} / {MAX_ANSWER_LENGTH}文字
            </span>
          </div>
        </div>

        <div className="assistant-actions">
          <button
            className="assistant-secondary-button"
            type="button"
            disabled={userMessages.length === 0}
            onClick={addAnswersToDiary}
          >
            自分の回答を日記本文へ追加
          </button>
          <button
            className="assistant-send-button"
            type="button"
            disabled={!canSend}
            onClick={sendAnswer}
          >
            {isSending ? "送信中..." : "AIへ回答する"}
          </button>
        </div>

        {draftAdded && (
          <p className="assistant-success" role="status">
            会話で書いた回答を、下の日記本文へ追加しました。
          </p>
        )}
        {reachedTurnLimit && (
          <p className="assistant-success" role="status">
            掘り下げは6回で終了です。回答を日記本文へ追加して整えてください。
          </p>
        )}
      </div>
    </details>
  );
}
