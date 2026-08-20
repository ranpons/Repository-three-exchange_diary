# ことばの交換日記(仮)

匿名交換日記の「日記を書く・投稿する」機能です。
本文、画像1枚、個人情報に関する確認、投稿後の固定、直前または直後の投稿者との即時交換を扱います。


## ローカルで画面を確認する

手順は以下の通り。

1. bashで以下を実行「npm run dev」
2. ブラウザで [http://localhost:3000/write](http://localhost:3000/write) を開く

Supabaseを動作させていない状態では、自動でローカル確認モードになります。ここでは以下を確認できます。

- 500文字上限
- 画像1枚・5MB・JPEG/PNG/WebPの制限
- 個人情報への注意と確認チェック
- 投稿後の編集不可画面
- 二つの異なるブラウザプロファイルでの交換待ち・交換成立

確認用データは開発サーバーを止めると消えます。実際の保存や受取画面はSupabase接続後に行います。


## Supabaseを接続する

bashで「npm run dev」を実行する前に、以下の操作が必要です。

1. `.env.local.example`をコピーして`.env.local`を作る
2. `.env.local`内にある`SUPABASE_URL`と`SUPABASE_PUBLISHABLE_KEY`と`SUPABASE_SECRET_KEY`と`HUGGINGFACE_API_KEY`を書き換える

URLとKEYは厳重に扱うこと。絶対に漏洩しないように、注意してください。
セキュリティの観点から、GitHub上にURLとKEYは記載しません(直接聞いてください)。
**`SUPABASE_URL`の末尾に`/rest/v1/`等のパスを付けないこと。** `@supabase/ssr`のクライアントは渡されたURLに対して`/auth/v1/`や`/rest/v1/`を自動で付け足すため、パス付きで設定すると認証・DB呼び出しが両方とも失敗する。
接続後は投稿時にSupabase Authの利用者IDを取得し、本文をSupabaseの`entries`へ、画像を非公開の`diary-images`へ保存します。
即時交換は`submit_entry_and_match`というデータベース関数が一括で行うため、同時投稿でも同じ日記を二重に交換しません。


## アカウント作成・ログイン

メール+パスワードでアカウント作成・ログイン・ログアウト・パスワード再設定ができます。表示名はSupabase Authの`user_metadata`に保存し、本名は持ちません。

- `/write`は未ログインだとアクセスできず、`/login`へ自動リダイレクトされます(`src/proxy.ts`、Next.js 16の Proxy 機能)
- パスワードは8文字以上、かつ英字と数字をそれぞれ1文字以上含む必要があります(`src/lib/authValidation.ts`)
- Supabase無料枠のデフォルトSMTPはメール送信のレート制限が厳しいため、短時間に何度もサインアップ/パスワード再設定を試すと`email rate limit exceeded`エラーになることがあります(実装の不具合ではありません)

### メール確認(Confirm email)を有効にする場合の設定

サインアップ確認・パスワード再設定は、どちらもSupabaseから送られるメールのリンクが`/auth/confirm`(`src/app/auth/confirm/route.ts`)に着地する前提で実装しています。これを機能させるには、Supabaseダッシュボードで以下の設定が必要です(いずれもプロジェクトの管理権限が必要な操作です)。

1. **Authentication > Sign In / Providers > Email > 「Confirm email」をON**にする
2. **Authentication > URL Configuration > Redirect URLs** に、アプリのURL(例: `http://localhost:3000/**`、本番URLがあればそれも)を追加する
3. **Authentication > Email Templates** で、以下の2つのテンプレートのリンクを書き換える(初期状態は`{{ .ConfirmationURL }}`というSupabase側のURLになっているため、`token_hash`を使う形式に変更する必要がある)

   **Confirm signup**
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/write">アカウントを確認する</a>
   ```

   **Reset Password**
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password/update">パスワードを再設定する</a>
   ```

この設定が済むまでは、`Confirm email`はOFFのままにしておくことを推奨します(ONのままテンプレート未設定だと、サインアップ後にSupabase標準のページへ飛んでしまい、`/auth/confirm`を通らずログインできません)。


## AI質問と掘り下げチャット

Hugging Face Inference ProvidersのChat Completion APIを、Next.jsのサーバー側から呼び出します。トークンはブラウザへ渡しません。

- その日の質問がSupabaseにあれば、全員に同じ質問を表示する。
- なければAIが一つ生成し、`questions`へ保存する。
- AIが利用できない場合は、固定候補から質問を選んで保存する。
- 掘り下げチャットは最大6回答で、会話自体はSupabaseへ保存しない。
- 会話で書いた自分の回答だけを日記本文へ追加できる。

`SUPABASE_SECRET_KEY`と`HUGGINGFACE_API_KEY`はサーバー専用です。
実値をGitHub、画面、クライアント用コードへ記載しないでください。
掘り下げAPI(`/api/ai/follow-up`)はSupabase Authによる利用者確認を追加済みです(ローカル確認モードのみ未ログインでも利用可能)。


## アカウント作成・ログイン機能の中心ファイル
src/app/signup/page.tsx              アカウント作成画面
src/app/signup/actions.ts            サインアップ処理(表示名はuser_metadataに保存)
src/app/login/page.tsx               ログイン画面
src/app/login/actions.ts             ログイン処理・ログアウト処理
src/app/reset-password/page.tsx      パスワード再設定(メール送信)画面
src/app/reset-password/actions.ts    再設定メール送信処理
src/app/reset-password/update/page.tsx     新パスワード設定画面
src/app/reset-password/update/actions.ts   新パスワード更新処理
src/app/auth/confirm/route.ts        サインアップ確認・パスワード再設定メールの共通の受け皿
src/components/SignupForm.tsx        アカウント作成フォーム
src/components/LoginForm.tsx         ログインフォーム
src/components/ResetPasswordForm.tsx 再設定メール送信フォーム
src/components/UpdatePasswordForm.tsx 新パスワード入力フォーム
src/lib/authValidation.ts            メール・パスワード・表示名の入力チェック
src/lib/siteOrigin.ts                メールのリンク生成に使う自サイトURLの解決
src/proxy.ts                         未ログイン時に/writeへのアクセスを/loginへリダイレクト

## 投稿機能の中心ファイル
src/app/write/page.tsx              投稿画面の入口
src/components/DiaryForm.tsx        本文・同意・投稿ボタン
src/components/DiaryAssistant.tsx   AIとの掘り下げ会話
src/components/ImagePicker.tsx      画像選択とプレビュー
src/app/write/actions.ts            保存・即時交換の呼び出し
src/app/api/ai/follow-up/route.ts   AIチャットのサーバーAPI(要ログイン)
src/lib/ai/diaryAssistant.ts        Hugging Face呼び出し
src/lib/questions/dailyQuestion.ts  日次質問の取得・保存
src/lib/entryValidation.ts          入力制限の共通判定
