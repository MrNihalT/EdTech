import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Static files or API routes bypassing auth middleware logic
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Redirect root path
  if (pathname === "/") {
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Handle Unauthenticated users
  if (!user) {
    if (pathname.startsWith("/tutor") || pathname.startsWith("/student")) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Authenticated user: fetch role from profiles
  let role: "tutor" | "student" | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile) {
    role = profile.role as "tutor" | "student";
  }

  // If user is on /login or /
  if (pathname === "/login" || pathname === "/") {
    if (role === "tutor") {
      url.pathname = "/tutor";
      return NextResponse.redirect(url);
    } else if (role === "student") {
      url.pathname = "/student";
      return NextResponse.redirect(url);
    }
  }

  // Role-based route enforcement
  if (role === "tutor" && pathname.startsWith("/student")) {
    url.pathname = "/tutor";
    return NextResponse.redirect(url);
  }

  if (role === "student" && pathname.startsWith("/tutor")) {
    url.pathname = "/student";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};