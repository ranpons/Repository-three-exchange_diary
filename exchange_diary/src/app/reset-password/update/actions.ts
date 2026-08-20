"use server";

import { redirect } from "next/navigation";

import { type AuthState, validatePassword } from "@/lib/authValidation";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function updatePassword(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = textValue(formData.get("password"));
  const errors = validatePassword(password);

  if (errors.length > 0) {
    return {
      status: "error",
      message: "入力内容を確認してください。",
      errors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Supabase未接続のため、パスワード再設定は利用できません。",
      errors: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message:
        "再設定用リンクの有効期限が切れています。もう一度パスワード再設定をやり直してください。",
      errors: [],
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      status: "error",
      message: "パスワードを更新できませんでした。時間をおいて再試行してください。",
      errors: [],
    };
  }

  redirect("/write");
}
