import { SignupForm } from "@/components/SignupForm";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const demoMode = !isSupabaseConfigured();

  return (
    <main className="write-page">
      <div className="write-shell">
        <header className="write-header">
          <div>
            <span className="eyebrow">ANONYMOUS EXCHANGE DIARY</span>
            <h1>アカウントを作成</h1>
            <p>
              表示名だけで登録できます。本名や個人が特定できる情報は使わないでください。
            </p>
          </div>
        </header>

        {demoMode ? (
          <div className="demo-banner" role="status">
            Supabase未接続のため、アカウント作成は利用できません。`.env.local`にSUPABASE_URLとSUPABASE_PUBLISHABLE_KEYを設定してください。
          </div>
        ) : (
          <section className="diary-panel">
            <div className="diary-form">
              <SignupForm />
            </div>
          </section>
        )}

        <p className="auth-switch">
          すでにアカウントをお持ちですか？ <a href="/login">ログイン</a>
        </p>
      </div>
    </main>
  );
}
