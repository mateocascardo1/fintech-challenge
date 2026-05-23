import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/auth"];

const PUBLIC_API_PREFIXES = [
  "/api/quote",
  "/api/search",
  "/api/news",
  "/api/fundamentals",
  "/api/history",
  "/api/arg-market",
  "/api/earnings",
  "/api/market-recap",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => request.nextUrl.pathname === route) ||
    PUBLIC_API_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  if (user && (request.nextUrl.pathname === "/auth" || request.nextUrl.pathname === "/")) {
    const url = request.nextUrl.clone();
    if (request.nextUrl.searchParams.get("demo") === "1") {
      url.pathname = "/onboarding";
      url.searchParams.set("demo", "1");
    } else {
      url.pathname = "/dashboard";
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  const isDemoOnboarding =
    request.nextUrl.pathname === "/onboarding" &&
    request.nextUrl.searchParams.get("demo") === "1";

  if (user && (request.nextUrl.pathname === "/dashboard" || request.nextUrl.pathname === "/onboarding")) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single(),
      supabase
        .from("positions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    const hasPortfolio = profile?.onboarding_completed && (count ?? 0) > 0;

    if (!hasPortfolio && request.nextUrl.pathname === "/dashboard") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (hasPortfolio && request.nextUrl.pathname === "/onboarding" && !isDemoOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
