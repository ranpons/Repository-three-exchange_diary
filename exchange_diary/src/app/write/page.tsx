import { signOut } from "@/app/login/actions";
import { DiaryForm } from "@/components/DiaryForm";
import { isDiaryAiConfigured } from "@/lib/ai/diaryAssistant";
import { getDailyQuestion } from "@/lib/questions/dailyQuestion";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WriteDiaryPage() {
  const demoMode = !isSupabaseConfigured();
  const question = await getDailyQuestion();

  return (
    <main className="write-page">
      <div className="write-shell">
        <header className="write-header">
          <div>
            <span className="eyebrow">ANONYMOUS EXCHANGE DIARY</span>
            <h1>ことばの交換日記</h1>
            <p>あなたの日記は、匿名の誰か一人へ渡ります。</p>
          </div>
          <div className="write-header-actions">
            <span className="mode-badge">
              {demoMode ? "ローカル確認モード" : "投稿受付中"}
            </span>
            {!demoMode && (
              <form action={signOut}>
                <button className="logout-button" type="submit">
                  ログアウト
                </button>
              </form>
            )}
          </div>
        </header>

        {demoMode && (
          <div className="demo-banner" role="status">
            Supabase未接続のため、現在は画面確認用の一時デモです。入力制限と交換待ち・交換成立の画面は確認できますが、再起動すると投稿内容は消えます。
          </div>
        )}

        {question.notice && (
          <div className="setup-banner" role="status">
            {question.notice}
          </div>
        )}

        <DiaryForm
          aiAssistantEnabled={isDiaryAiConfigured()}
          demoMode={demoMode}
          question={question}
        />
      </div>
    </main>
  );
}
