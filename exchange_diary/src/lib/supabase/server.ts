import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isSupabaseAdminConfigured() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

export function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Supabaseの管理用環境変数が設定されていません。");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabaseの環境変数が設定されていません。");
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie updates are handled by the authentication middleware on pages.
        }
      },
    },
  });
}
