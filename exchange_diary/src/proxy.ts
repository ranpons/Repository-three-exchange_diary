import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 未ログインでもアクセスできるパス。
// "/reset-password/update"は再設定メールのリンクを踏んだ後の専用セッションが
// 必要なため、"/reset-password"とは別に厳密一致のみで公開する。
const PUBLIC_PATH_PREFIXES = ["/login", "/signup", "/auth/confirm"];
const PUBLIC_EXACT_PATHS = ["/reset-password"];

export async function proxy(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  // Supabase未接続時はローカル確認モードのため、認証チェックをスキップする。
  if (!url || !publishableKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath =
    PUBLIC_PATH_PREFIXES.some((path) => pathname.startsWith(path)) ||
    PUBLIC_EXACT_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPath) {
    const writeUrl = request.nextUrl.clone();
    writeUrl.pathname = "/write";
    return NextResponse.redirect(writeUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
