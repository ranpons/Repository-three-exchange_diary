import { LoginForm } from "@/components/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const demoMode = !isSupabaseConfigured();

  return (
    <main className="write-page">
      <div className="write-shell">
        <header className="write-header">
          <div>
            <span className="eyebrow">ANONYMOUS EXCHANGE DIARY</span>
            <h1>ログイン</h1>
            <p>登録したメールアドレスとパスワードでログインします。</p>
          </div>
        </header>

        {demoMode ? (
          <div className="demo-banner" role="status">
            Supabase未接続のため、ログインは利用できません。`.env.local`にSUPABASE_URLとSUPABASE_PUBLISHABLE_KEYを設定してください。
          </div>
        ) : (
          <section className="diary-panel">
            <div className="diary-form">
              <LoginForm />
            </div>
          </section>
        )}

        <p className="auth-switch">
          アカウントをお持ちでないですか？ <a href="/signup">アカウントを作成</a>
        </p>
        <p className="auth-switch">
          <a href="/reset-password">パスワードをお忘れですか？</a>
        </p>
      </div>
    </main>
  );
}
