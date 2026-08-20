import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

// サインアップ確認・パスワード再設定のメールリンクが着地する共通の受け皿。
// Supabaseの確認メールは `token_hash` と `type` をクエリパラメータで付与する。
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/write";

  if (!isSupabaseConfigured() || !tokenHash || !type) {
    redirect("/login?error=confirm_failed");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    redirect("/login?error=confirm_failed");
  }

  redirect(next);
}
