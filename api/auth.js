import {
  json, loadUsers, pbkdf2, fromB64u, equalBytes, signToken,
  redisConfig, redis, TOKEN_DAYS,
} from "./_shared.js";

export const config = { runtime: "edge" };

const MAX_TRIES = 10;      // mỗi 15 phút, tính theo tên đăng nhập
const WINDOW = 900;

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Chỉ nhận POST" }, 405);

  const secret = process.env.AUTH_SECRET;
  if (!secret) return json({ error: "Máy chủ chưa đặt AUTH_SECRET" }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Dữ liệu không hợp lệ" }, 400); }

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !password) return json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" }, 400);

  // chặn dò mật khẩu — bỏ qua nếu chưa gắn Redis
  if (redisConfig()) {
    try {
      const key = `vlv:rl:${username}`;
      const tries = await redis(["INCR", key]);
      if (tries === 1) await redis(["EXPIRE", key, WINDOW]);
      if (tries > MAX_TRIES)
        return json({ error: "Sai quá nhiều lần. Thử lại sau 15 phút." }, 429);
    } catch { /* Redis lỗi thì vẫn cho đăng nhập, chỉ mất phần giới hạn */ }
  }

  const users = loadUsers();
  const record = users.get(username);

  // luôn chạy PBKDF2 kể cả khi không có user, để thời gian phản hồi không lộ tên nào tồn tại
  const salt = record ? fromB64u(record.salt) : new Uint8Array(16);
  const derived = await pbkdf2(password, salt);
  const ok = record && equalBytes(derived, fromB64u(record.hash));

  if (!ok) return json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }, 401);

  if (redisConfig()) { try { await redis(["DEL", `vlv:rl:${username}`]); } catch {} }

  const token = await signToken(
    { u: username, exp: Date.now() + TOKEN_DAYS * 864e5 }, secret);

  return json({ token, username, syncEnabled: !!redisConfig() });
}
