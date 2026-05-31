/**
 * AuthService - 认证服务
 * 负责密码验证、Token 生成和请求授权
 */

// JWT 配置
const JWT_SECRET = "prompt-library-secret-key-change-in-production"; // 生产环境从 env 获取
const JWT_EXPIRY = 3600; // 1 小时

// 速率限制配置
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 900; // 15 分钟

/**
 * 生成 JWT Token
 */
async function generateToken(data, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...data,
    iat: now,
    exp: now + JWT_EXPIRY,
  };

  // 使用 Web Crypto API 进行 HMAC 签名
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const headerBase64 = btoa(JSON.stringify(header));
  const payloadBase64 = btoa(JSON.stringify(payload));

  const signatureInput = `${headerBase64}.${payloadBase64}`;
  const signatureData = encoder.encode(signatureInput);

  const signature = await crypto.subtle.sign("HMAC", key, signatureData);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

/**
 * 验证 JWT Token
 */
async function verifyToken(token, secret) {
  try {
    const [headerBase64, payloadBase64, signatureBase64] = token.split(".");

    // 验证签名
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = Uint8Array.from(atob(signatureBase64), (c) =>
      c.charCodeAt(0)
    );

    const signatureInput = `${headerBase64}.${payloadBase64}`;
    const signatureData = encoder.encode(signatureInput);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      signatureData
    );

    if (!isValid) {
      return null;
    }

    // 验证过期时间
    const payload = JSON.parse(atob(payloadBase64));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * 密码验证（使用 SHA-256 哈希）
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password, hash) {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

/**
 * 检查速率限制
 */
async function checkRateLimit(kv, ip) {
  const key = `auth:attempts:${ip}`;
  const attempts = parseInt((await kv.get(key)) || "0");

  if (attempts >= MAX_ATTEMPTS) {
    return false;
  }

  return true;
}

async function incrementRateLimit(kv, ip) {
  const key = `auth:attempts:${ip}`;
  const attempts = parseInt((await kv.get(key)) || "0");

  await kv.put(key, (attempts + 1).toString(), {
    expirationTtl: RATE_LIMIT_WINDOW,
  });
}

async function resetRateLimit(kv, ip) {
  const key = `auth:attempts:${ip}`;
  await kv.delete(key);
}

/**
 * 验证请求授权
 */
export async function verifyRequest(request, env) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  const secret = env.JWT_SECRET || JWT_SECRET;

  return verifyToken(token, secret);
}

/**
 * 密码登录服务
 */
export async function login(password, env, ip) {
  const { ADMIN_PASSWORD_HASH, JWT_SECRET: envSecret, PROMPTS_KV } = env;

  // 检查速率限制
  const canAttempt = await checkRateLimit(PROMPTS_KV, ip);
  if (!canAttempt) {
    throw new Error("登录尝试次数过多，请稍后再试");
  }

  // 验证密码
  const isPasswordValid = await verifyPassword(
    password,
    ADMIN_PASSWORD_HASH
  );

  if (!isPasswordValid) {
    await incrementRateLimit(PROMPTS_KV, ip);
    throw new Error("密码错误");
  }

  // 密码正确，重置速率限制
  await resetRateLimit(PROMPTS_KV, ip);

  // 生成 Token
  const secret = envSecret || JWT_SECRET;
  const token = await generateToken({ role: "admin" }, secret);

  return {
    token,
    expiresIn: JWT_EXPIRY,
  };
}

export { verifyPassword, hashPassword, generateToken, verifyToken };
