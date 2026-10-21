import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getViewer, routeFeature } from "@/lib/access";
import { canViewUser, isRestricted } from "@/lib/types";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/cron"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();

  const session = process.env.AUTH_SECRET ? await auth() : null;

  if (process.env.AUTH_SECRET && !session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const viewer = getViewer(session?.user?.email);
  if (viewer.restricted.length) {
    const { pathname } = request.nextUrl;
    const isApi = pathname.startsWith("/api/");
    const userEmail = pathname.match(/^\/(?:api\/)?users\/([^/]+)/)?.[1];
    const feature = routeFeature(pathname, request.method);
    const forbidden = userEmail
      ? !canViewUser(viewer, decodeURIComponent(userEmail))
      : !!feature && isRestricted(viewer, feature);
    if (forbidden) {
      return isApi
        ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
        : NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.png|logo\\.png|.*\\.svg).*)"],
};
