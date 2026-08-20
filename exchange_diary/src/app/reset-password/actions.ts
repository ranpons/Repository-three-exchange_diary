"use server";

import { type AuthState, validateEmailOnly } from "@/lib/authValidation";
import { resolveSiteOrigin } from "@/lib/siteOrigin";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function requestPasswordReset(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = textValue(formData.get("email"));
  const validation = validateEmailOnly(email);

  if (!validation.isValid) {
    return {
      status: "error",
      message: "入力内容を確認してください。",
      errors: validation.errors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Supabase未接続のため、パスワード再設定は利用できません。",
      errors: [],
    };
  }

  const origin = await resolveSiteOrigin();
  const supabase = await createSupabaseServerClient();

  // メールが未登録でも、登録有無が外部から分からないよう同じ成功メッセージを返す。
  // 実際のリンク形式(token_hash/type)はSupabase側のメールテンプレート設定に従う。
  // テンプレートの設定方法はREADMEを参照。
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password/update`,
  });

  return {
    status: "info",
    message:
      "そのメールアドレスが登録済みの場合、パスワード再設定用のリンクを送信しました。",
    errors: [],
  };
}
