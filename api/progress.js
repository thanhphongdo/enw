import { json, requireUser, redis, redisConfig, progressKey } from "./_shared.js";

export const config = { runtime: "edge" };

const MAX_ENTRIES = 6000;          // 5000 câu + biên an toàn
const MAX_TEXT = 600;

/* Hợp nhất theo từng câu: bản nào có mốc thời gian mới hơn thì thắng.
   Nhờ vậy hai thiết bị làm hai nhóm câu khác nhau vẫn gộp được đủ,
   thay vì bên đẩy lên sau ghi đè sạch bên kia. */
function merge(base, incoming) {
  const out = { ...base };
  for (const id in incoming) {
    const a = out[id], b = incoming[id];
    if (!b || typeof b !== "object") continue;
    if (!a || (b.at || 0) > (a.at || 0)) out[id] = b;
  }
  return out;
}

function sanitize(raw) {
  const clean = {};
  if (!raw || typeof raw !== "object") return clean;
  let n = 0;
  for (const id in raw) {
    if (++n > MAX_ENTRIES) break;
    if (!/^\d+$/.test(id)) continue;
    const v = raw[id];
    if (!v || typeof v !== "object") continue;
    clean[id] = {
      text: String(v.text || "").slice(0, MAX_TEXT),
      score: v.score === null || v.score === undefined ? null
        : Math.max(0, Math.min(100, Math.round(Number(v.score) || 0))),
      ai: !!v.ai,
      at: Number(v.at) || 0,
    };
  }
  return clean;
}

async function read(user) {
  const raw = await redis(["GET", progressKey(user)]);
  if (!raw) return {};
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return {}; }
}

export default async function handler(req) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  if (!redisConfig())
    return json({ error: "Máy chủ chưa gắn Upstash Redis nên chưa đồng bộ được" }, 503);

  try {
    if (req.method === "GET") {
      return json({ progress: await read(auth.user) });
    }

    if (req.method === "POST") {
      let body;
      try { body = await req.json(); } catch { return json({ error: "Dữ liệu không hợp lệ" }, 400); }

      const incoming = sanitize(body.progress);
      // replace = true dùng cho nút "Làm lại", ghi đè hẳn thay vì hợp nhất
      const merged = body.replace ? incoming : merge(await read(auth.user), incoming);

      await redis(["SET", progressKey(auth.user), JSON.stringify(merged)]);
      return json({ progress: merged, saved: Object.keys(merged).length });
    }

    return json({ error: "Phương thức không hỗ trợ" }, 405);
  } catch (e) {
    return json({ error: "Lỗi lưu trữ: " + e.message }, 502);
  }
}
