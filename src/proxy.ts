import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from "./routes";

export async function proxy(request: NextRequest) {
  const session = getSessionCookie(request);

  const isApiAuth = request.nextUrl.pathname.startsWith(apiAuthPrefix);

  // 公开的 API 路由（不需要认证）
  const publicApiRoutes = ['/api/webhook', '/api/checkout', '/api/billing'];
  const isPublicApiRoute = publicApiRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  const isAuthRoute = () => {
    return authRoutes.some((path) => request.nextUrl.pathname.startsWith(path));
  };

  // 允许认证相关的 API 路由
  if (isApiAuth) {
    return NextResponse.next();
  }

  // 允许公开的 API 路由（如 webhook、checkout 等）
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  if (isAuthRoute()) {
    if (session) {
      return NextResponse.redirect(
        new URL(DEFAULT_LOGIN_REDIRECT, request.url),
      );
    }
    return NextResponse.next();
  }

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
