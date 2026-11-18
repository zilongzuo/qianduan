# 三角洲 · DELTA

游屹辰的个人博客。深墨底 + 层次金色，宋体标题，零依赖静态构建，部署在 Cloudflare Pages。

线上地址：<https://bk.zuozilong.asia>（备用：<https://delta-blog.pages.dev>）

## 快速开始

```bash
node build.mjs        # 构建到 dist/
npm run preview       # 构建 + 本地预览 http://127.0.0.1:4321
npm run deploy        # 构建 + 部署到 Cloudflare Pages
```

需要 Node 18+。构建脚本没有任何第三方依赖。

## 写一篇新文章

在 `content/posts/` 下新建 `YYYY-MM-DD-slug.md`：

```markdown
---
title: 文章标题
subtitle: 一句话副题，会显示在标题下方
date: 2026-12-01
tag: 随笔
excerpt: 列表页的摘要，约 50–80 字
---

正文第一段。段落之间空一行。

## 二级标题

支持 **加粗**、*强调*、`行内代码`、[链接](https://example.com)、
> 引用、列表、代码块和分隔线。
```

保存后重新 `node build.mjs` 即可。文件名去掉日期后就是 URL：`/posts/slug`。

## 目录结构

```
build.mjs              生成器：解析 Markdown → 生成全部页面
preview.mjs            本地预览服务器（模拟 Pages 的 clean URL）
content/posts/*.md     文章
content/about.md       关于页正文
static/assets/         样式、脚本（原样复制到 dist）
static/_headers        Cloudflare 响应头（CSP、缓存）
static/_redirects      重定向规则
dist/                  构建产物（部署这个目录）
```

## 标签

标签的中文名到 URL 的映射写在 `build.mjs` 的 `TAG_SLUGS` 里。新增标签时补一行即可，
未登记的标签会退化成 URL 编码的中文路径（能用，但不好看）。

## 站点信息

站名、作者、域名、简介集中在 `build.mjs` 顶部的 `SITE` 对象里，改完重新构建。

## 部署与域名

首次部署需要创建项目（只需一次）：

```bash
npx wrangler pages project create delta-blog --production-branch=main
```

之后 `npm run deploy` 就是一次完整的发布。

自定义域名 `bk.zuozilong.asia` 已绑定到 Pages 项目，状态为「活动」，SSL 已启用。
它依赖 zone `zuozilong.asia` 里的这条记录（已配置，勿删）：

| 类型 | 名称 | 内容 | 代理状态 |
| ---- | ---- | ---- | -------- |
| CNAME | `bk` | `delta-blog.pages.dev` | 已代理（橙色云） |

记录若被删除，域名会退回「正在验证」并在几分钟后失效；按上表补回即可，证书会重新自动签发。

## 内容授权

文章采用 CC BY-NC-SA 4.0 授权，转载请注明出处。
