import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/components/UpdatePasswordForm";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
  if (!isSupabaseConfigured()) {
    redirect("/reset-password");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 再設定メールのリンクを踏んでいない(=セッションが無い)場合はやり直してもらう。
  if (!user) {
    redirect("/reset-password");
  }

  return (
    <main className="write-page">
      <div className="write-shell">
        <header className="write-header">
          <div>
            <span className="eyebrow">ANONYMOUS EXCHANGE DIARY</span>
            <h1>新しいパスワードを設定</h1>
            <p>本人確認が完了しました。新しいパスワードを入力してください。</p>
          </div>
        </header>

        <section className="diary-panel">
          <div className="diary-form">
            <UpdatePasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}
