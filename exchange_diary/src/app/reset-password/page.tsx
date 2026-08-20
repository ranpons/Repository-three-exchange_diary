import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const demoMode = !isSupabaseConfigured();

  return (
    <main className="write-page">
      <div className="write-shell">
        <header className="write-header">
          <div>
            <span className="eyebrow">ANONYMOUS EXCHANGE DIARY</span>
            <h1>パスワード再設定</h1>
            <p>登録したメールアドレス宛に再設定用のリンクを送信します。</p>
          </div>
        </header>

        {demoMode ? (
          <div className="demo-banner" role="status">
            Supabase未接続のため、パスワード再設定は利用できません。
          </div>
        ) : (
          <section className="diary-panel">
            <div className="diary-form">
              <ResetPasswordForm />
            </div>
          </section>
        )}

        <p className="auth-switch">
          <a href="/login">ログインへ戻る</a>
        </p>
      </div>
    </main>
  );
}
