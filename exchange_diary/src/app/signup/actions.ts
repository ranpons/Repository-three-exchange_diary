"use server";

import { redirect } from "next/navigation";

import { type AuthState, validateSignup } from "@/lib/authValidation";
import { resolveSiteOrigin } from "@/lib/siteOrigin";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function signUp(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = textValue(formData.get("email"));
  const password = textValue(formData.get("password"));
  const displayName = textValue(formData.get("displayName"));

  const validation = validateSignup({ email, password, displayName });

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
      message: "Supabase未接続のため、アカウント作成は利用できません。",
      errors: [],
    };
  }

  const origin = await resolveSiteOrigin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: validation.normalizedDisplayName },
      emailRedirectTo: `${origin}/auth/confirm?next=/write`,
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "user_already_exists"
          ? "このメールアドレスはすでに登録されています。"
          : "アカウントを作成できませんでした。時間をおいて再試行してください。",
      errors: [],
    };
  }

  // メール確認が無効な場合はsignUp直後にセッションが張られる。
  if (data.session) {
    redirect("/write");
  }

  return {
    status: "info",
    message:
      "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。",
    errors: [],
  };
}
