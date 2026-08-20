"use client";

import { useActionState, useMemo, useState } from "react";

import { signIn } from "@/app/login/actions";
import { initialAuthState, validateLogin } from "@/lib/authValidation";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    signIn,
    initialAuthState,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const validation = useMemo(
    () => validateLogin({ email, password }),
    [email, password],
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

  return (
    <form className="auth-form" action={formAction} onSubmit={handleSubmit}>
      <div className="form-section">
        <label className="field-label" htmlFor="login-email">
          メールアドレス
        </label>
        <input
          className="auth-input"
          id="login-email"
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
        <label className="field-label" htmlFor="login-password">
          パスワード
        </label>
        <input
          className="auth-input"
          id="login-password"
          name="password"
          type="password"
          value={password}
          disabled={isPending}
          onChange={(event) => {
            setPassword(event.target.value);
            resetClientErrors();
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
          {isPending ? "ログイン中..." : "ログインする"}
        </button>
      </div>
    </form>
  );
}
