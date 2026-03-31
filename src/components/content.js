import fs from "node:fs";
import path from "node:path";

export const SUPPORTED_LANGS = ["zh-hk", "zh-cn", "ja", "ko"];

const POSTS_DIR = path.resolve("src/content/posts");
const BRANDS_DIR = path.resolve("src/content/brands");

function stripQuotes(value = "") {
  return String(value)
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}

export function slugifyCategory(value = "") {
  return slugify(value);
}

function getTimeValue(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function isPublished(item) {
  const rawDate = item.publish_at || item.date;
  if (!rawDate) return true;
  return getTimeValue(rawDate) <= Date.now();
}

function inferLangFromPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  for (const lang of SUPPORTED_LANGS) {
    if (normalized.includes(`/${lang}/`)) return lang;
  }
  return "zh-hk";
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (!tags) return [];

  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function defaultAllLabel(lang) {
  switch (lang) {
    case "zh-cn":
      return "全部";
    case "ja":
      return "すべて";
    case "ko":
      return "전체";
    case "zh-hk":
    default:
      return "全部";
  }
}

function buildExcerpt(body = "", maxLength = 160) {
  const plain = String(body)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/[*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trim()}…`;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const [, frontmatter, body] = match;
  const data = {};
  const lines = frontmatter.split(/\r?\n/);

  let currentKey = null;
  let currentArray = null;

  function commitArray() {
    if (currentKey && Array.isArray(currentArray)) {
      data[currentKey] = currentArray.slice();
    }
    currentKey = null;
    currentArray = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "    ");
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (currentKey && /^\s*-\s+/.test(line)) {
      currentArray.push(stripQuotes(trimmed.replace(/^-+\s*/, "")));
      continue;
    }

    if (/^[A-Za-z0-9_-]+\s*:/.test(trimmed)) {
      commitArray();

      const idx = trimmed.indexOf(":");
      const key = trimmed.slice(0, idx).trim();
      const rest = trimmed.slice(idx + 1).trim();

      if (rest === "") {
        currentKey = key;
        currentArray = [];
      } else {
        data[key] = stripQuotes(rest);
      }
      continue;
    }

    if (currentKey && trimmed.startsWith("- ")) {
      currentArray.push(stripQuotes(trimmed.slice(2).trim()));
    }
  }

  commitArray();

  return {
    data,
    body: body.trim()
  };
}

function inlineMarkdownToHtml(text = "") {
  let html = escapeHtml(text);

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^\*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  return html;
}

function markdownToHtml(markdown = "") {
  if (!markdown) return "";

  const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
  const html = [];

  let inList = false;
  let inOrderedList = false;
  let inBlockquote = false;
  let inCodeBlock = false;
  let codeBuffer = [];
  let paragraphBuffer = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) return;
    const paragraph = paragraphBuffer.join(" ").trim();
    if (paragraph) {
      html.push(`<p>${inlineMarkdownToHtml(paragraph)}</p>`);
    }
    paragraphBuffer = [];
  }

  function closeLists() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      flushParagraph();
      html.push("</blockquote>");
      inBlockquote = false;
    }
  }

  function closeCodeBlock() {
    if (inCodeBlock) {
      html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
      inCodeBlock = false;
      codeBuffer = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeLists();
      closeBlockquote();

      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeLists();
      closeBlockquote();

      const level = headingMatch[1].length;
      const content = inlineMarkdownToHtml(headingMatch[2]);
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      closeBlockquote();

      if (inOrderedList) {
        html.push("</ol>");
        inOrderedList = false;
      }
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }

      html.push(`<li>${inlineMarkdownToHtml(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      closeBlockquote();

      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      if (!inOrderedList) {
        html.push("<ol>");
        inOrderedList = true;
      }

      html.push(`<li>${inlineMarkdownToHtml(olMatch[1])}</li>`);
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      closeLists();

      if (!inBlockquote) {
        html.push("<blockquote>");
        inBlockquote = true;
      }

      paragraphBuffer.push(quoteMatch[1]);
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  closeLists();
  closeBlockquote();
  closeCodeBlock();

  return html.join("\n");
}

function getMarkdownFiles(baseDir) {
  const results = [];
  const visited = new Set();

  if (!fs.existsSync(baseDir)) return results;

  function walk(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const normalized = path.normalize(fullPath);

      if (visited.has(normalized)) continue;
      visited.add(normalized);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  }

  walk(baseDir);
  return results;
}

function buildItemFromMarkdown(filePath, keyName = "title", type = "post") {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, body } = parseFrontmatter(raw);

  const filenameSlug = path.basename(filePath, ".md");
  const lang = data.lang || inferLangFromPath(filePath);
  const cover = data.cover || "";
  const title = data.title || data.name || "";
  const name = data.name || "";
  const category = data.category || "";
  const bodyHtml = markdownToHtml(body);
  const excerpt = data.excerpt || buildExcerpt(body);

  return {
    type,
    slug: data.slug || filenameSlug,
    original_slug: data.original_slug || data.slug || filenameSlug,
    lang,
    title,
    name,
    category,
    category_slug: data.category_slug || slugifyCategory(category),
    author: data.author || "AKOMARO Editorial",
    country: data.country || "",
    date: data.date || "",
    publish_at: data.publish_at || "",
    excerpt,
    body,
    body_html: bodyHtml,
    cover,
    cover_caption: data.cover_caption || "",
    image1: data.image1 || "",
    image1_caption: data.image1_caption || "",
    image2: data.image2 || "",
    image2_caption: data.image2_caption || "",
    image3: data.image3 || "",
    image3_caption: data.image3_caption || "",
    images: Array.isArray(data.images) ? data.images : [],
    logo: data.logo || "",
    og_image: data.og_image || cover || "",
    website: data.website || "",
    tags: normalizeTags(data.tags),
    seo_title: data.seo_title || data[keyName] || title || name || "",
    seo_description: data.seo_description || excerpt || "",
    sponsor: data.sponsor || "",
    cta_text: data.cta_text || "",
    cta_link: data.cta_link || "",
    status: data.status || "published",
    source_path: filePath
  };
}

function readMarkdownCollection(baseDir, keyName = "title", type = "post") {
  const files = getMarkdownFiles(baseDir);
  const items = files.map((filePath) => buildItemFromMarkdown(filePath, keyName, type));

  return items.sort((a, b) => {
    const aTime = getTimeValue(a.publish_at || a.date);
    const bTime = getTimeValue(b.publish_at || b.date);
    return bTime - aTime;
  });
}

export function getAllPosts() {
  return readMarkdownCollection(POSTS_DIR, "title", "post");
}

export function getPublishedPosts(lang = null) {
  return getAllPosts().filter((post) => {
    const langMatch = !lang || post.lang === lang;
    const statusOk =
      !post.status ||
      post.status === "published" ||
      post.status === "publish";

    return langMatch && statusOk && isPublished(post);
  });
}

export function getPublishedPostBySlug(lang, slug) {
  return getPublishedPosts(lang).find((post) => post.slug === slug);
}

export function getPostCategories(lang) {
  const posts = getPublishedPosts(lang);
  const map = new Map();

  for (const post of posts) {
    const rawSlug = post.category_slug || slugifyCategory(post.category || "");
    const slug = rawSlug || "uncategorized";
    const name = post.category || defaultAllLabel(lang);

    if (!map.has(slug)) {
      map.set(slug, {
        slug,
        name,
        count: 1
      });
    } else {
      map.get(slug).count += 1;
    }
  }

  const categories = Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (!categories.some((item) => item.slug === "all")) {
    categories.unshift({
      slug: "all",
      name: defaultAllLabel(lang),
      count: posts.length
    });
  }

  return categories;
}

export function getPostsByCategory(lang, categorySlug) {
  const posts = getPublishedPosts(lang);

  if (categorySlug === "all") return posts;

  return posts.filter((post) => {
    const rawSlug = post.category_slug || slugifyCategory(post.category || "");
    const slug = rawSlug || "uncategorized";
    return slug === categorySlug;
  });
}

export function getAllBrands() {
  return readMarkdownCollection(BRANDS_DIR, "name", "brand");
}

export function getPublishedBrands(lang = null) {
  return getAllBrands().filter((brand) => {
    const langMatch = !lang || brand.lang === lang;
    const statusOk =
      !brand.status ||
      brand.status === "published" ||
      brand.status === "publish";

    return langMatch && statusOk && isPublished(brand);
  });
}

export function getPublishedBrandBySlug(lang, slug) {
  return getPublishedBrands(lang).find((brand) => brand.slug === slug);
}

export function getAlternates(type, originalSlug) {
  const source = type === "brand" ? getAllBrands() : getAllPosts();

  return source
    .filter((item) => item.original_slug === originalSlug && isPublished(item))
    .map((item) => ({
      lang: item.lang,
      slug: item.slug
    }));
}
