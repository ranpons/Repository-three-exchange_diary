"use client";

import Image from "next/image";
import { useActionState, useMemo, useRef, useState } from "react";

import { submitDiaryEntry } from "@/app/write/actions";
import { DiaryAssistant } from "@/components/DiaryAssistant";
import { ImagePicker } from "@/components/ImagePicker";
import {
  initialSubmissionState,
  MAX_DIARY_CHARACTERS,
  validateEntry,
} from "@/lib/entryValidation";

type DiaryFormProps = {
  aiAssistantEnabled: boolean;
  demoMode: boolean;
  question: {
    id: string;
    text: string;
    source: "ai" | "fallback" | "manual";
  };
};

function createDemoUserId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function DiaryForm({
  aiAssistantEnabled,
  demoMode,
  question,
}: DiaryFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitDiaryEntry,
    initialSubmissionState,
  );
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const demoUserIdRef = useRef<HTMLInputElement>(null);

  const validation = useMemo(
    () =>
      validateEntry({
        body,
        image:
          image === null
            ? null
            : { name: image.name, size: image.size, type: image.type },
        privacyAcknowledged,
      }),
    [body, image, privacyAcknowledged],
  );

  const submitted = state.status === "waiting" || state.status === "matched";
  const visibleErrors = clientErrors.length > 0 ? clientErrors : state.errors;
  const canSubmit = validation.isValid && !isPending;

  function validateBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!validation.isValid) {
      event.preventDefault();
      setClientErrors(validation.errors);
      return;
    }

    if (demoMode && demoUserIdRef.current) {
      const storageKey = "exchange-diary-demo-user-id";
      const storedId = window.localStorage.getItem(storageKey);
      const userId = storedId ?? createDemoUserId();

      if (!storedId) {
        window.localStorage.setItem(storageKey, userId);
      }

      demoUserIdRef.current.value = userId;
    }

    setClientErrors([]);
  }

  function resetClientErrors() {
    if (clientErrors.length > 0) {
      setClientErrors([]);
    }
  }

  if (submitted) {
    const matched = state.status === "matched";

    return (
      <section className="diary-panel submission-result" aria-live="polite">
        <span className="status-label">
          {matched ? "EXCHANGE MATCHED" : "WAITING FOR A MATCH"}
        </span>
        <h2>{matched ? "交換が成立しました" : "日記を預かりました"}</h2>
        <p>{state.message}</p>
        <div className="notice-box">
          {matched
            ? "あなたの日記は匿名の相手へ渡りました。内容の編集・削除はできません。"
            : "次に同じ質問へ投稿した人と自動で交換されます。時間による締め切りはありません。"}
        </div>
        {matched && state.receivedDiary && (
          <div className="received-diary">
            <span className="status-label">だれかから届いた日記</span>
            <p>{state.receivedDiary.body}</p>
            {state.receivedDiary.imageUrl ? (
              <Image
                alt="匿名の相手が添えた写真"
                className="received-diary-image"
                height={900}
                src={state.receivedDiary.imageUrl}
                unoptimized
                width={1200}
              />
            ) : state.receivedDiary.hasImage ? (
              <p className="received-diary-image-note">写真が添えられています。</p>
            ) : null}
          </div>
        )}
        <div className="submitted-copy">
          <span className="status-label">あなたが送った日記</span>
          <p>{body}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="diary-panel">
      <div className="question-block">
        <span className="question-label">TODAY&apos;S QUESTION</span>
        <p className="question-text">{question.text}</p>
        <p className="question-source">
          {question.source === "ai"
            ? "AIが作成した今日の質問"
            : question.source === "fallback"
              ? "固定候補から選んだ今日の質問"
              : "開発用の質問"}
        </p>
      </div>

      <form
        className="diary-form"
        action={formAction}
        encType="multipart/form-data"
        onSubmit={validateBeforeSubmit}
      >
        <input name="questionId" type="hidden" value={question.id} />
        {demoMode && (
          <input ref={demoUserIdRef} name="demoUserId" type="hidden" />
        )}

        <div className="form-section">
          <DiaryAssistant
            enabled={aiAssistantEnabled}
            question={question.text}
            onUseDraft={(draft) => {
              setBody((current) =>
                [current.trim(), draft.trim()]
                  .filter(Boolean)
                  .join("\n\n")
                  .slice(0, MAX_DIARY_CHARACTERS),
              );
              resetClientErrors();
            }}
          />
        </div>

        <div className="form-section">
          <label className="field-label" htmlFor="diary-body">
            今日のことば
          </label>
          <textarea
            className="diary-textarea"
            id="diary-body"
            name="body"
            value={body}
            maxLength={MAX_DIARY_CHARACTERS + 100}
            placeholder="今日あったこと、思ったこと、誰かに渡してみたいことを書いてください。"
            aria-invalid={visibleErrors.length > 0}
            aria-describedby="diary-length privacy-notice"
            required
            disabled={isPending}
            onChange={(event) => {
              setBody(event.target.value);
              resetClientErrors();
            }}
          />
          <div className="field-meta" id="diary-length">
            <span>送信後は内容を変更できません。</span>
            <span
              className={`char-count${
                body.trim().length > MAX_DIARY_CHARACTERS ? " is-over-limit" : ""
              }`}
            >
              {body.trim().length} / {MAX_DIARY_CHARACTERS}文字
            </span>
          </div>
        </div>

        <div className="form-section">
          <ImagePicker
            disabled={isPending}
            file={image}
            onChange={(nextImage) => {
              setImage(nextImage);
              resetClientErrors();
            }}
          />
        </div>

        <div className="form-section" id="privacy-notice">
          <div className="privacy-notice">
            <strong>匿名性を守るための確認</strong>
            本名、住所、電話番号、メールアドレス、学校・職場、SNSアカウント、位置情報、他者を特定できる情報は書かないでください。画像に顔、名札、住所、学校名、車のナンバーなどが写っていないかも確認してください。
          </div>
          <label className="privacy-confirmation">
            <input
              className="privacy-check"
              name="privacyAcknowledged"
              type="checkbox"
              checked={privacyAcknowledged}
              disabled={isPending}
              onChange={(event) => {
                setPrivacyAcknowledged(event.target.checked);
                resetClientErrors();
              }}
            />
            <span>
              個人情報や他者を特定できる内容を含めていないこと、送信後は編集・削除できないことを確認しました。
            </span>
          </label>
        </div>

        {(visibleErrors.length > 0 || state.status === "error") && (
          <div className="error-box" role="alert">
            <strong>{state.message || "入力内容を確認してください。"}</strong>
            {visibleErrors.length > 0 && (
              <ul>
                {visibleErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="submit-row">
          <button className="submit-button" type="submit" disabled={!canSubmit}>
            {isPending ? "日記を送信中..." : "この内容で送信する"}
          </button>
        </div>
      </form>
    </section>
  );
}
