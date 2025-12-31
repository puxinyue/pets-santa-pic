
import { createAuthClient } from "better-auth/react";

/**
 * 初始化 Better Auth 客户端
 * baseURL 应该是你后端的 API 地址（例如：http://localhost:3000）
 */
export const authClient = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
});
