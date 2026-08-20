"use client";

import { useActionState, useMemo, useState } from "react";

import { signUp } from "@/app/signup/actions";
import {
  MAX_DISPLAY_NAME_CHARACTERS,
  MIN_PASSWORD_CHARACTERS,
  PASSWORD_REQUIREMENT_HINT,
  initialAuthState,
  validateSignup,
} from "@/lib/authValidation";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signUp,
    initialAuthState,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const validation = useMemo(
    () => validateSignup({ email, password, displayName }),
    [email, password, displayName],
  );

  const visibleErrors = clientErrors.length > 0 ? clientErrors : state.errors;
  const canSubmit = validation.isValid && !isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!validation.isValid) {
      event.preventDefault();
      setClientErrors(validation.errors);
      return;
    }

    setClientErrors([]);
  }

  function resetClientErrors() {
    if (clientErrors.length > 0) {
      setClientErrors([]);
    }
  }

  if (state.status === "info") {
    return (
      <div className="notice-box" role="status">
        {state.message}
      </div>
    );
  }

  return (
    <form className="auth-form" action={formAction} onSubmit={handleSubmit}>
      <div className="form-section">
        <label className="field-label" htmlFor="signup-display-name">
          表示名
        </label>
        <input
          className="auth-input"
          id="signup-display-name"
          name="displayName"
          type="text"
          maxLength={MAX_DISPLAY_NAME_CHARACTERS}
          placeholder="ニックネームで構いません"
          value={displayName}
          disabled={isPending}
          onChange={(event) => {
            setDisplayName(event.target.value);
            resetClientErrors();
          }}
          required
        />
      </div>

      <div className="form-section">
        <label className="field-label" htmlFor="signup-email">
          メールアドレス
        </label>
        <input
          className="auth-input"
          id="signup-email"
          name="email"
          type="email"
          value={email}
          disabled={isPending}
          onChange={(event) => {
            setEmail(event.target.value);
            resetClientErrors();
          }}
          required
        />
      </div>

      <div className="form-section">
        <label className="field-label" htmlFor="signup-password">
          パスワード
        </label>
        <input
          className="auth-input"
          id="signup-password"
          name="password"
          type="password"
          minLength={MIN_PASSWORD_CHARACTERS}
          value={password}
          disabled={isPending}
          onChange={(event) => {
            setPassword(event.target.value);
            resetClientErrors();
          }}
          required
        />
        <div className="field-meta">
          <span>
            {MIN_PASSWORD_CHARACTERS}文字以上、{PASSWORD_REQUIREMENT_HINT}
          </span>
        </div>
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
          {isPending ? "作成中..." : "アカウントを作成する"}
        </button>
      </div>
    </form>
  );
}
