"use client";

import { useActionState, useMemo, useState } from "react";

import { updatePassword } from "@/app/reset-password/update/actions";
import {
  MIN_PASSWORD_CHARACTERS,
  PASSWORD_REQUIREMENT_HINT,
  initialAuthState,
  validatePassword,
} from "@/lib/authValidation";

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    updatePassword,
    initialAuthState,
  );
  const [password, setPassword] = useState("");
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const validationErrors = useMemo(() => validatePassword(password), [password]);
  const visibleErrors = clientErrors.length > 0 ? clientErrors : state.errors;
  const canSubmit = validationErrors.length === 0 && !isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (validationErrors.length > 0) {
      event.preventDefault();
      setClientErrors(validationErrors);
      return;
    }

    setClientErrors([]);
  }

  return (
    <form className="auth-form" action={formAction} onSubmit={handleSubmit}>
      <div className="form-section">
        <label className="field-label" htmlFor="update-password">
          新しいパスワード
        </label>
        <input
          className="auth-input"
          id="update-password"
          name="password"
          type="password"
          minLength={MIN_PASSWORD_CHARACTERS}
          value={password}
          disabled={isPending}
          onChange={(event) => {
            setPassword(event.target.value);
            if (clientErrors.length > 0) {
              setClientErrors([]);
            }
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
          {isPending ? "更新中..." : "パスワードを更新する"}
        </button>
      </div>
    </form>
  );
}
