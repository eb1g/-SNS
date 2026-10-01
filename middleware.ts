import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  let currentProfile: { role: string; is_suspended: boolean } | null = null;
  if (user && !request.nextUrl.pathname.startsWith("/api/")) {
    const { data } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).maybeSingle();
    currentProfile = data;
    if (data?.is_suspended && data.role !== "admin" && request.nextUrl.pathname !== "/suspended") {
      return NextResponse.redirect(new URL("/suspended", request.url));
    }
  }
  if (request.nextUrl.pathname === "/admin") {
    if (!user) return NextResponse.redirect(new URL("/", request.url));
    if (currentProfile?.role !== "admin") return NextResponse.redirect(new URL("/", request.url));
  }

  if (request.nextUrl.pathname === "/settings" && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
