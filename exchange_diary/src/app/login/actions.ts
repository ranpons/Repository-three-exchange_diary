"use server";

import { redirect } from "next/navigation";

import { type AuthState, validateLogin } from "@/lib/authValidation";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function signIn(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = textValue(formData.get("email"));
  const password = textValue(formData.get("password"));

  const validation = validateLogin({ email, password });

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
      message: "Supabase未接続のため、ログインは利用できません。",
      errors: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      status: "error",
      message: "メールアドレスまたはパスワードが正しくありません。",
      errors: [],
    };
  }

  redirect("/write");
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
