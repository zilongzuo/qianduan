// 本地预览：模拟 Cloudflare Pages 的 clean URL 行为
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const PORT = Number(process.env.PORT) || 4321;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

function resolve(pathname) {
  const base = path.join(ROOT, pathname);
  const candidates = [base, base + ".html", path.join(base, "index.html")];
  for (const c of candidates) if (isFile(c)) return c;
  return path.join(ROOT, "404.html");
}

http
  .createServer((req, res) => {
    try {
      let pathname = decodeURIComponent((req.url || "/").split("?")[0]);
      if (pathname.endsWith("/")) pathname += "index.html";

      const file = resolve(pathname);
      const body = fs.readFileSync(file);

      res.statusCode = file.endsWith("404.html") ? 404 : 200;
      res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
      res.end(body);
    } catch (err) {
      res.statusCode = 500;
      res.end("500 " + err.message);
    }
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`→ http://127.0.0.1:${PORT}`);
  });
