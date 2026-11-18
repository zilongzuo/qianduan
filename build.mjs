#!/usr/bin/env node
/**
 * 三角洲 DELTA — 零依赖静态博客生成器
 *
 *   node build.mjs          构建到 dist/
 *   node build.mjs --serve  构建并用本地服务器预览
 *
 * 内容放在 content/posts/*.md，样式脚本放在 static/。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "dist");

/* ------------------------------------------------------------------ */
/* 站点配置                                                            */
/* ------------------------------------------------------------------ */

const SITE = {
  name: "三角洲",
  en: "DELTA",
  tagline: "交汇处的笔记",
  author: "游屹辰",
  url: "https://bk.zuozilong.asia",
  desc: "游屹辰的个人博客。技术、写作与手艺三条河在交汇处放慢，把泥沙与念头一起交给海。",
  email: "hi@zuozilong.asia",
  since: "2026",
};

const TAG_SLUGS = {
  随笔: "essay",
  手艺: "craft",
  思考: "thought",
  系统: "system",
};

const tagSlug = (t) => TAG_SLUGS[t] || encodeURIComponent(t);

const QUOTES = [
  { text: "交汇处的水最肥，但也最浑。要肥，就得接受浑。", cite: "卷一 · 在三角洲上开始写作" },
  { text: "工具解决「能不能」，手艺回答「该不该」。", cite: "卷二 · 把工具磨成手艺" },
  { text: "「没时间」往往不是时间的短缺，是精度的赤字。", cite: "卷三 · 慢是一种分辨率" },
  { text: "可维护的反面不是混乱，是脆弱。", cite: "卷四 · 可维护的人生" },
];

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function inline(text) {
  const stash = [];
  let s = text.replace(/`([^`]+)`/g, (_m, c) => {
    stash.push("<code>" + esc(c) + "</code>");
    return "\u0000" + (stash.length - 1) + "\u0001";
  });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\u0000(\d+)\u0001/g, (_m, i) => stash[Number(i)]);
  return s;
}

function markdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let para = [];
  let i = 0;

  const flush = () => {
    if (para.length) {
      out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      flush();
      i++;
      continue;
    }

    if (/^```/.test(line)) {
      flush();
      const lang = line.replace(/^```/, "").trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        "<pre><code" +
          (lang ? ' class="language-' + esc(lang) + '"' : "") +
          ">" +
          esc(buf.join("\n")) +
          "</code></pre>"
      );
      continue;
    }

    let m = line.match(/^(#{2,4})\s+(.*)$/);
    if (m) {
      flush();
      const lvl = m[1].length;
      out.push("<h" + lvl + ">" + inline(m[2]) + "</h" + lvl + ">");
      i++;
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) {
      flush();
      out.push("<hr>");
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push("<blockquote>" + markdown(buf.join("\n")) + "</blockquote>");
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push("<ul>" + items.map((t) => "<li>" + inline(t) + "</li>").join("") + "</ul>");
      continue;
    }

    if (/^\s*\d+[.、)]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && /^\s*\d+[.、)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.、)]\s+/, ""));
        i++;
      }
      out.push("<ol>" + items.map((t) => "<li>" + inline(t) + "</li>").join("") + "</ol>");
      continue;
    }

    para.push(line.trim());
    i++;
  }

  flush();
  return out.join("\n");
}

function readingTime(md) {
  const cjk = (md.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (md.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 220));
}

const MONTHS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

function cnDate(iso) {
  const [y, m, d] = iso.split("-");
  return {
    full: y + " 年 " + Number(m) + " 月 " + Number(d) + " 日",
    short: m + "." + d,
    year: y,
  };
}

function write(file, content) {
  const target = path.join(OUT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

/* ------------------------------------------------------------------ */
/* 内容读取                                                            */
/* ------------------------------------------------------------------ */

const postDir = path.join(ROOT, "content", "posts");
const posts = fs
  .readdirSync(postDir)
  .filter((f) => f.endsWith(".md"))
  .map((file) => {
    const raw = fs.readFileSync(path.join(postDir, file), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error("缺少 front matter: " + file);

    const meta = {};
    m[1].split(/\r?\n/).forEach((line) => {
      const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (kv) meta[kv[1]] = kv[2].trim();
    });

    const body = m[2].trim();
    const slug = meta.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    const date = meta.date || file.slice(0, 10);

    return {
      slug,
      title: meta.title || slug,
      subtitle: meta.subtitle || "",
      date,
      tag: meta.tag || "随笔",
      excerpt: meta.excerpt || body.replace(/[#>*`\-]/g, "").slice(0, 78) + "…",
      minutes: readingTime(body),
      html: markdown(body),
      body,
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

const tagGroups = {};
posts.forEach((p) => {
  (tagGroups[p.tag] = tagGroups[p.tag] || []).push(p);
});
const tags = Object.keys(tagGroups);
const latest = posts[0];

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

const RIVER_ART = `
<svg viewBox="0 0 480 470" role="img" aria-label="三角洲水系示意">
  <defs>
    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7d5f24" stop-opacity="0.12"/>
      <stop offset="45%" stop-color="#d9b364" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#f8ecc9" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="fan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d9b364" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#d9b364" stop-opacity="0.01"/>
    </linearGradient>
  </defs>

  <!-- 上游三条河 -->
  <g stroke="url(#rg)" fill="none" stroke-linecap="round">
    <path class="river-line faint" d="M176 -14 C 188 86, 210 160, 234 214"/>
    <path class="river-line faint" d="M240 -20 C 240 80, 240 150, 240 212"/>
    <path class="river-line faint" d="M306 -12 C 294 84, 270 158, 246 214"/>
  </g>

  <!-- 入海的分支 -->
  <g stroke="url(#rg)" fill="none" stroke-linecap="round">
    <path class="river-line" d="M240 214 C 236 292, 196 384, 118 470"/>
    <path class="river-line" d="M240 214 C 240 296, 224 388, 200 470"/>
    <path class="river-line" d="M240 214 C 244 300, 262 390, 296 470"/>
    <path class="river-line" d="M240 214 C 250 292, 302 378, 388 466"/>
    <path class="river-line faint" d="M240 214 C 230 284, 168 350, 70 452"/>
    <path class="river-line faint" d="M240 214 C 252 288, 320 356, 428 440"/>
  </g>

  <!-- 主航道的水流 -->
  <path class="river-line flow" style="stroke:#f8ecc9;opacity:.45"
        d="M240 214 C 244 300, 262 390, 296 470"/>

  <!-- 河口节点 -->
  <circle class="delta-node" cx="240" cy="214" r="3.2"/>
  <g fill="none" stroke="#d9b364">
    <circle cx="240" cy="214" r="26" stroke-opacity="0.26" stroke-width="0.7"/>
    <circle cx="240" cy="214" r="52" stroke-opacity="0.13" stroke-width="0.7"/>
    <circle cx="240" cy="214" r="82" stroke-opacity="0.06" stroke-width="0.7"/>
  </g>

  <!-- 海岸线 -->
  <g fill="none" stroke="#8d6b2b" stroke-width="0.7">
    <path d="M20 436 Q 240 424, 460 438" stroke-opacity="0.3"/>
    <path d="M96 452 L 190 452" stroke-opacity="0.16" stroke-dasharray="2 7"/>
    <path d="M250 458 L 372 458" stroke-opacity="0.16" stroke-dasharray="2 7"/>
    <path d="M150 464 L 236 464" stroke-opacity="0.1" stroke-dasharray="2 7"/>
  </g>
</svg>`;

function nav(active) {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="/">
      <span class="brand-mark">${SITE.name}</span>
      <span class="brand-en">${SITE.en}</span>
    </a>
    <nav class="nav-links">
      ${link("/", "卷首", "home")}
      ${link("/archive", "文章", "archive")}
      ${link("/tags", "标签", "tags")}
      ${link("/about", "关于", "about")}
    </nav>
  </div>
</header>`;
}

function footer() {
  const y = new Date().getFullYear();
  return `<footer class="foot">
  <div class="wrap">
    <div class="foot-inner">
      <div>
        <div class="foot-brand">${SITE.name} · ${SITE.en}</div>
        <p class="foot-tag">${SITE.tagline}<br>${SITE.author} 著 · 始于 ${SITE.since}</p>
      </div>
      <div class="foot-links">
        <a href="/feed.xml">RSS</a>
        <a href="/archive">全部文章</a>
        <a href="/about">关于</a>
        <a href="mailto:${SITE.email}">写信</a>
      </div>
    </div>
    <div class="foot-copy">
      <span>© ${SITE.since}–${y} ${SITE.author}　保留所有权利</span>
      <span>${SITE.url.replace("https://", "")}</span>
    </div>
  </div>
</footer>
<button class="to-top" aria-label="回到顶部">↑</button>`;
}

function layout({ title, desc, active, body, isPost = false }) {
  const fullTitle = title ? `${title} · ${SITE.name}` : `${SITE.name} · ${SITE.tagline}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || SITE.desc)}">
<meta name="author" content="${esc(SITE.author)}">
<meta name="theme-color" content="#0a0906">
<link rel="canonical" href="${SITE.url}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${isPost ? "article" : "website"}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc || SITE.desc)}">
<meta property="og:url" content="${SITE.url}/">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="/feed.xml">
<link rel="stylesheet" href="/assets/style.css">
<script src="/assets/boot.js"></script>
${isPost ? '<div class="progress" aria-hidden="true"></div>' : ""}
</head>
<body>
<a class="skip" href="#main" style="position:absolute;left:-9999px">跳到正文</a>
${nav(active)}
${body}
${footer()}
<script src="/assets/main.js" defer></script>
</body>
</html>`;
}

const tagPill = (tag) =>
  `<a class="tag" href="/tags/${tagSlug(tag)}">${esc(tag)}</a>`;

function postRow(p, idx) {
  const d = cnDate(p.date);
  return `<li class="post-row reveal">
  <div class="row-index">${String(idx).padStart(2, "0")}</div>
  <div>
    <h3 class="row-title"><a href="/posts/${p.slug}">${esc(p.title)}</a></h3>
    <p class="row-sub">${esc(p.subtitle)}</p>
    <p class="row-excerpt">${esc(p.excerpt)}</p>
  </div>
  <div class="row-side">
    <div>${d.full.replace(/ /g, "")}</div>
    ${tagPill(p.tag)}
  </div>
</li>`;
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */

function buildHome() {
  const quote = QUOTES[0];
  const body = `<main id="main">
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <p class="overline">卷首 · 二〇二六年 十一月</p>
          <h1 class="hero-title">${SITE.name}</h1>
          <p class="hero-sub">${SITE.tagline}</p>
          <p class="hero-lede">技术、写作与手艺，三条河在这里放慢，<br>把泥沙与念头一起交给海。</p>
          <div class="hero-meta">
            <span>${SITE.author} 著</span><i></i>
            <span>共 ${posts.length} 篇</span><i></i>
            <span>更新于 ${cnDate(latest.date).short}</span>
          </div>
        </div>
        <div class="hero-art">${RIVER_ART}</div>
      </div>
      <a class="scroll-cue" href="#latest">向下 · 近作</a>
    </div>
  </section>

  <section class="section" id="latest">
    <div class="wrap">
      <div class="section-head">
        <h2>近 作</h2>
        <a class="more" href="/archive">全部文章 →</a>
      </div>
      <ol class="post-list">
        ${posts.slice(0, 6).map((p, i) => postRow(p, i + 1)).join("\n")}
      </ol>
    </div>
  </section>

  <section class="quote-band">
    <blockquote>${esc(quote.text)}</blockquote>
    <cite>${esc(quote.cite)}</cite>
  </section>
</main>`;

  return layout({
    title: "",
    desc: SITE.desc,
    active: "home",
    body,
  });
}

function buildPost(p) {
  const idx = posts.findIndex((x) => x.slug === p.slug);
  const prev = posts[idx + 1];
  const next = posts[idx - 1];
  const d = cnDate(p.date);

  const navCard = (item, dir, label, cls) =>
    item
      ? `<a class="${cls}" href="/posts/${item.slug}"><span class="dir">${label}</span><span class="t">${esc(item.title)}</span></a>`
      : `<div class="${cls} empty"><span class="dir">${label}</span><span class="t">没有更多了</span></div>`;

  const body = `<main id="main">
  <article class="post">
    <header class="post-head">
      <a class="tag-pill" href="/tags/${tagSlug(p.tag)}">${esc(p.tag)}</a>
      <h1>${esc(p.title)}</h1>
      <p class="post-sub">${esc(p.subtitle)}</p>
      <div class="post-meta">
        <span>${SITE.author}</span><i></i>
        <time datetime="${p.date}">${d.full}</time><i></i>
        <span>约 ${p.minutes} 分钟</span>
      </div>
    </header>
    <div class="prose">${p.html}</div>
    <footer class="post-foot">
      <a class="back" href="/archive">← 回到文章列表</a>
      <div class="post-nav">
        ${navCard(prev, "prev", "上一篇 · PREV", "prev")}
        ${navCard(next, "next", "下一篇 · NEXT", "next")}
      </div>
    </footer>
  </article>
  <div class="wrap"><div style="height:1px"></div></div>
</main>`;

  return layout({
    title: p.title,
    desc: p.excerpt,
    active: "",
    body,
    isPost: true,
  });
}

function buildArchive() {
  const byYear = {};
  posts.forEach((p) => {
    const y = cnDate(p.date).year;
    (byYear[y] = byYear[y] || []).push(p);
  });

  const blocks = Object.keys(byYear)
    .sort()
    .reverse()
    .map(
      (y) => `<div class="year-block reveal">
      <div class="year-label">${y}</div>
      <ul class="year-list">
        ${byYear[y]
          .map((p) => {
            const d = cnDate(p.date);
            return `<li><span class="d">${d.short}</span><a href="/posts/${p.slug}">${esc(p.title)}</a><span class="tag-mini">${esc(p.tag)}</span></li>`;
          })
          .join("\n")}
      </ul>
    </div>`
    )
    .join("\n");

  const body = `<main id="main">
  <section class="page-head">
    <div class="wrap">
      <h1>文章</h1>
      <p>共 ${posts.length} 篇，按年份归档。这里没有分类，只有写下来时刚好在意的事。</p>
    </div>
  </section>
  <div class="wrap">${blocks}</div>
</main>`;

  return layout({ title: "文章", desc: "全部文章归档", active: "archive", body });
}

function buildTags() {
  const wall = tags
    .map((t, i) => {
      const d = cnDate(tagGroups[t][0].date);
      return `<a class="tag-card reveal" href="/tags/${tagSlug(t)}">
      <span class="tc-index">${String(i + 1).padStart(2, "0")}</span>
      <span class="tc-name">${esc(t)}</span>
      <span class="tc-meta">${tagGroups[t].length} 篇 · 最近 ${d.year}.${d.short}</span>
    </a>`;
    })
    .join("\n");

  const body = `<main id="main">
  <section class="page-head">
    <div class="wrap">
      <h1>标签</h1>
      <p>三条河，若干支流。每一篇都只属于一条支流，不贪心。</p>
    </div>
  </section>
  <div class="wrap">
    <div class="tag-wall">${wall}</div>
  </div>
</main>`;

  return layout({ title: "标签", desc: "按标签浏览文章", active: "tags", body });
}

function buildTagPage(tag) {
  const list = tagGroups[tag];
  const body = `<main id="main">
  <section class="page-head">
    <div class="wrap">
      <h1>${esc(tag)}</h1>
      <p>共 ${list.length} 篇</p>
    </div>
  </section>
  <div class="wrap" style="padding-top:20px">
    <ol class="post-list">
      ${list.map((p, i) => postRow(p, i + 1)).join("\n")}
    </ol>
  </div>
</main>`;

  return layout({ title: tag, desc: `标签：${tag}`, active: "tags", body });
}

function buildAbout() {
  const raw = fs.readFileSync(path.join(ROOT, "content", "about.md"), "utf8");
  const bodyMd = raw.replace(/^---[\s\S]*?---\s*/, "").trim();

  const body = `<main id="main">
  <section class="page-head">
    <div class="wrap">
      <h1>关于</h1>
      <p>一个人，三条河。</p>
    </div>
  </section>
  <div class="wrap">
    <div class="about-grid">
      <div class="prose">${markdown(bodyMd)}</div>
      <aside class="card reveal">
        <p class="mono-label">PROFILE</p>
        <h2>${SITE.author}</h2>
        <p>写作者 / 工程师</p>
        <div class="divider"></div>
        <ul>
          <li><span>站点</span><span>${SITE.name}</span></li>
          <li><span>文章</span><span>${posts.length} 篇</span></li>
          <li><span>始于此</span><span>${SITE.since}</span></li>
          <li><span>来信</span><span>${SITE.email}</span></li>
        </ul>
        <div class="divider"></div>
        <p>内容采用 CC BY-NC-SA 4.0 授权，<br>转载请注明出处。</p>
      </aside>
    </div>
  </div>
</main>`;

  return layout({ title: "关于", desc: "关于作者与这个博客", active: "about", body });
}

function build404() {
  const body = `<main id="main">
  <section class="page-head">
    <div class="wrap">
      <h1>404</h1>
      <p>这条支流已经改道了。你要找的页面不在这里。</p>
      <p style="margin-top:28px"><a class="back" href="/" style="font-family:var(--mono);font-size:12px;letter-spacing:.2em;color:var(--gold-300)">← 回到卷首</a></p>
    </div>
  </section>
</main>`;
  return layout({ title: "页面不存在", desc: "404", active: "", body });
}

function buildFeed() {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE.url}/posts/${p.slug}</link>
      <guid isPermaLink="true">${SITE.url}/posts/${p.slug}</guid>
      <pubDate>${new Date(p.date + "T09:00:00+08:00").toUTCString()}</pubDate>
      <category>${esc(p.tag)}</category>
      <description>${esc(p.excerpt)}</description>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)} · ${esc(SITE.tagline)}</title>
    <link>${SITE.url}</link>
    <description>${esc(SITE.desc)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(posts[0].date + "T09:00:00+08:00").toUTCString()}</lastBuildDate>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

function buildSitemap() {
  const urls = [
    { loc: "/", lastmod: latest.date, pri: "1.0" },
    { loc: "/archive", lastmod: latest.date, pri: "0.8" },
    { loc: "/tags", lastmod: latest.date, pri: "0.5" },
    { loc: "/about", lastmod: latest.date, pri: "0.6" },
    ...posts.map((p) => ({ loc: "/posts/" + p.slug, lastmod: p.date, pri: "0.9" })),
    ...tags.map((t) => ({ loc: "/tags/" + tagSlug(t), lastmod: tagGroups[t][0].date, pri: "0.4" })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${SITE.url}${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority></url>`
  )
  .join("\n")}
</urlset>
`;
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0a0906"/>
  <path d="M32 12 C 30 26, 24 36, 15 52" fill="none" stroke="#d9b364" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M32 12 C 32 28, 32 40, 32 53" fill="none" stroke="#f8ecc9" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M32 12 C 34 26, 40 36, 49 52" fill="none" stroke="#bd9440" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="32" cy="13" r="2.6" fill="#ecd08c"/>
</svg>
`;

/* ------------------------------------------------------------------ */
/* 构建                                                                */
/* ------------------------------------------------------------------ */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// 静态资源
const staticDir = path.join(ROOT, "static");
if (fs.existsSync(staticDir)) {
  fs.cpSync(staticDir, OUT, { recursive: true });
}
fs.writeFileSync(path.join(OUT, "favicon.svg"), FAVICON, "utf8");

// 页面
write("index.html", buildHome());
write("archive.html", buildArchive());
write("tags.html", buildTags());
write("about.html", buildAbout());
write("404.html", build404());
posts.forEach((p) => write(`posts/${p.slug}.html`, buildPost(p)));
tags.forEach((t) => write(`tags/${tagSlug(t)}.html`, buildTagPage(t)));

// 订阅与索引
write("feed.xml", buildFeed());
write("sitemap.xml", buildSitemap());
write(
  "robots.txt",
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`
);

const bytes = (dir) => {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    total += e.isDirectory() ? bytes(f) : fs.statSync(f).size;
  }
  return total;
};

console.log(
  `✓ 构建完成 · ${posts.length} 篇文章 · ${tags.length} 个标签 · ${(bytes(OUT) / 1024).toFixed(1)} KB → dist/`
);
posts.forEach((p) => console.log(`  · ${p.date}  ${p.title}  (${p.minutes} 分钟)`));
