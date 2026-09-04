// Gộp các file raw-<topic>.json do agent sinh ra -> data/sentences.js
// Chạy: node data/build.js   (từ thư mục gốc english-writing)
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const TOPICS = ["daily","family","work","school","food","travel","transport","shopping",
                "money","health","tech","social","entertainment","weather","society"];
const LEVELS = ["A2","B1","B2"];

// ---------- 1. đọc + kiểm tra schema ----------
let all = [], problems = [], missing = [];
for (const t of TOPICS) {
  const f = path.join(DIR, `raw-${t}.json`);
  if (!fs.existsSync(f)) { missing.push(t); continue; }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(f, "utf8")); }
  catch (e) { problems.push(`${t}: JSON hỏng — ${e.message}`); continue; }
  if (!Array.isArray(arr)) { problems.push(`${t}: không phải mảng`); continue; }

  arr.forEach((x, i) => {
    const where = `${t}[${i}]`;
    if (!LEVELS.includes(x.level)) problems.push(`${where}: level sai "${x.level}"`);
    if (x.topic !== t) problems.push(`${where}: topic sai "${x.topic}"`);
    if (!Array.isArray(x.chunks) || x.chunks.length < 2) problems.push(`${where}: chunks không hợp lệ`);
    else {
      if (!x.chunks.every(c => c && typeof c.t === "string" && c.t.trim()))
        problems.push(`${where}: có chunk rỗng`);
      if (!x.chunks.every(c => c && typeof c.en === "string" && c.en.trim()))
        problems.push(`${where}: có chunk thiếu gợi ý "en"`);
      if (x.chunks.some(c => /^[.,;:!?]/.test(c.t)))
        problems.push(`${where}: chunk bắt đầu bằng dấu câu`);
    }
    if (!Array.isArray(x.answers) || x.answers.length !== 2)
      problems.push(`${where}: cần đúng 2 đáp án`);
    else {
      if (!x.answers.every(a => typeof a === "string" && a.trim().length > 5))
        problems.push(`${where}: đáp án rỗng/quá ngắn`);
      if (x.answers[0].trim() === x.answers[1].trim())
        problems.push(`${where}: 2 đáp án giống hệt nhau`);
      if (!/[.!?]$/.test(x.answers[0].trim()))
        problems.push(`${where}: đáp án 1 thiếu dấu câu cuối`);
    }
    const vi = (x.chunks || []).map(c => c.t).join(" ");
    if (!/[.!?]$/.test(vi.trim())) problems.push(`${where}: câu tiếng Việt thiếu dấu câu cuối`);
    if (/\s{2,}/.test(vi)) problems.push(`${where}: câu tiếng Việt có dấu cách đôi`);
    x._vi = vi;
    all.push(x);
  });
}

// ---------- 2. khử trùng lặp ----------
const seenVi = new Map(), seenEn = new Map();
const dups = [];
all = all.filter(x => {
  const kv = x._vi.toLowerCase().replace(/\s+/g, " ").trim();
  const ke = x.answers[0].toLowerCase().replace(/\s+/g, " ").trim();
  if (seenVi.has(kv)) { dups.push(`VI trùng (${x.topic} ~ ${seenVi.get(kv)}): ${x._vi}`); return false; }
  if (seenEn.has(ke)) { dups.push(`EN trùng (${x.topic} ~ ${seenEn.get(ke)}): ${x.answers[0]}`); return false; }
  seenVi.set(kv, x.topic); seenEn.set(ke, x.topic);
  return true;
});

// ---------- 3. sắp xếp: dễ -> khó, trộn đều chủ đề trong mỗi cấp ----------
const out = [];
for (const lv of LEVELS) {
  const byTopic = {};
  all.filter(x => x.level === lv).forEach(x => (byTopic[x.topic] ||= []).push(x));
  const queues = TOPICS.map(t => byTopic[t] || []).filter(q => q.length);
  let left = queues.reduce((n, q) => n + q.length, 0);
  let i = 0;
  while (left > 0) {                      // round-robin để không dồn cục theo chủ đề
    const q = queues[i % queues.length];
    if (q.length) { out.push(q.shift()); left--; }
    i++;
  }
}

// ---------- 4. đánh id + ghi file ----------
const final = out.map((x, i) => ({
  id: i + 1, level: x.level, topic: x.topic, chunks: x.chunks, answers: x.answers
}));
const js = "window.SENTENCES_DATA = " + JSON.stringify(final, null, 1) + ";\n";
fs.writeFileSync(path.join(DIR, "sentences.js"), js, "utf8");

// ---------- 5. báo cáo ----------
const byLevel = {}, byTopic = {};
final.forEach(x => { byLevel[x.level] = (byLevel[x.level] || 0) + 1;
                     byTopic[x.topic] = (byTopic[x.topic] || 0) + 1; });
console.log("=== KET QUA GOP ===");
console.log("Tong so cau:", final.length);
console.log("Theo level :", JSON.stringify(byLevel));
console.log("Theo topic :", TOPICS.map(t => `${t}:${byTopic[t] || 0}`).join("  "));
console.log("File       :", path.join(DIR, "sentences.js"),
            "(" + (fs.statSync(path.join(DIR, "sentences.js")).size / 1024 / 1024).toFixed(2) + " MB)");
if (missing.length)  console.log("\n!! THIEU FILE:", missing.join(", "));
if (dups.length)     console.log(`\n!! DA LOAI ${dups.length} cau trung lap`);
if (problems.length) {
  console.log(`\n!! ${problems.length} van de schema (10 dong dau):`);
  problems.slice(0, 10).forEach(p => console.log("   -", p));
} else if (!missing.length) {
  console.log("\nSchema: sach, khong loi.");
}
