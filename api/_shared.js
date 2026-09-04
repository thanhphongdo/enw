// Tiện ích dùng chung cho các API route (chạy trên Edge runtime của Vercel).
const enc = new TextEncoder();

export const ITERATIONS = 210000;          // PBKDF2-HMAC-SHA256, theo khuyến nghị OWASP
export const TOKEN_DAYS = 60;

/* ---------- base64url ---------- */
export function toB64u(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64u(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------- so sánh chống timing attack ---------- */
export function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ---------- băm mật khẩu ---------- */
export async function pbkdf2(password, salt, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

/* ---------- token có chữ ký HMAC ---------- */
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]);
}
export async function signToken(payload, secret) {
  const body = toB64u(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  return body + "." + toB64u(sig);
}
export async function verifyToken(token, secret) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  let expect;
  try {
    expect = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  } catch { return null; }
  let got;
  try { got = fromB64u(sig); } catch { return null; }
  if (!equalBytes(expect, got)) return null;
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(fromB64u(body))); } catch { return null; }
  if (!payload || typeof payload.u !== "string") return null;
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

/* ---------- danh sách user từ biến môi trường ----------
   USERS = "tên:salt_b64url:hash_b64url;tên2:...:..."   (sinh bằng tools/adduser.mjs) */
export function loadUsers() {
  const raw = process.env.USERS || "";
  const map = new Map();
  for (const row of raw.split(";")) {
    const line = row.trim();
    if (!line) continue;
    const [name, salt, hash] = line.split(":");
    if (name && salt && hash) map.set(name.toLowerCase(), { salt, hash });
  }
  return map;
}

/* ---------- Upstash Redis qua REST ---------- */
export function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}
export async function redis(command) {
  const cfg = redisConfig();
  if (!cfg) throw new Error("Chưa cấu hình Upstash Redis");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

/* ---------- phản hồi JSON ---------- */
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/* ---------- lấy user đang đăng nhập từ header ---------- */
export async function requireUser(req) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return { error: json({ error: "Máy chủ chưa đặt AUTH_SECRET" }, 500) };
  const head = req.headers.get("authorization") || "";
  const token = head.startsWith("Bearer ") ? head.slice(7) : "";
  const payload = await verifyToken(token, secret);
  if (!payload) return { error: json({ error: "Phiên đăng nhập không hợp lệ" }, 401) };
  return { user: payload.u };
}

export const progressKey = (user) => `vlv:progress:${user}`;
