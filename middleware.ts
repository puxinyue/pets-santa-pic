import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 允许所有请求通过，在 API 路由中处理认证
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
