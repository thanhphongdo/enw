#!/usr/bin/env node
// Sinh một dòng user để dán vào biến môi trường USERS trên Vercel.
//   node tools/adduser.mjs <tên đăng nhập> <mật khẩu>
// Nhiều user thì nối các dòng bằng dấu chấm phẩy.

const ITERATIONS = 210000;
const enc = new TextEncoder();

const toB64u = (bytes) =>
  Buffer.from(bytes).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const [, , nameArg, passArg] = process.argv;
if (!nameArg || !passArg) {
  console.error("Cách dùng: node tools/adduser.mjs <tên đăng nhập> <mật khẩu>");
  process.exit(1);
}
const name = nameArg.trim().toLowerCase();
if (!/^[a-z0-9._-]{2,32}$/.test(name)) {
  console.error("Tên đăng nhập chỉ gồm a-z, 0-9, dấu . _ - và dài 2–32 ký tự.");
  process.exit(1);
}
if (passArg.length < 8) {
  console.error("Mật khẩu nên dài từ 8 ký tự trở lên.");
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", enc.encode(passArg), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, key, 256);

console.log("\nDán chuỗi dưới đây vào biến môi trường USERS trên Vercel");
console.log("(nếu đã có user khác, nối thêm bằng dấu chấm phẩy):\n");
console.log(`${name}:${toB64u(salt)}:${toB64u(new Uint8Array(bits))}\n`);
