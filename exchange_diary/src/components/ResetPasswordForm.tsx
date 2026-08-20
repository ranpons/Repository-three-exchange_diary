"use client";

import { useActionState, useMemo, useState } from "react";

import { requestPasswordReset } from "@/app/reset-password/actions";
import { initialAuthState, validateEmailOnly } from "@/lib/authValidation";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialAuthState,
  );
  const [email, setEmail] = useState("");
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const validation = useMemo(() => validateEmailOnly(email), [email]);
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
        <label className="field-label" htmlFor="reset-email">
          メールアドレス
        </label>
        <input
          className="auth-input"
          id="reset-email"
          name="email"
          type="email"
          value={email}
          disabled={isPending}
          onChange={(event) => {
            setEmail(event.target.value);
            if (clientErrors.length > 0) {
              setClientErrors([]);
            }
          }}
          required
        />
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
          {isPending ? "送信中..." : "再設定メールを送る"}
        </button>
      </div>
    </form>
  );
}
