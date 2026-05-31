/**
 * /api/auth - 认证端点
 * POST: 登录验证，返回 JWT Token
 */

import { login } from "../../src/services/AuthService.js";

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // CORS 处理
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // 只允许 POST 请求
  if (method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  try {
    // 解析请求体
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ error: "请输入密码" }),
        { status: 400, headers }
      );
    }

    // 获取客户端 IP（用于速率限制）
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "unknown";

    // 调用登录服务
    const result = await login(password, env, ip);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Login error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "登录失败",
      }),
      { status: 401, headers }
    );
  }
}
