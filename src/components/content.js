import fs from "node:fs";
import path from "node:path";

export const SUPPORTED_LANGS = ["zh-hk", "zh-cn", "ja", "ko"];

const POSTS_DIR = path.resolve("src/content/posts");
const BRANDS_DIR = path.resolve("src/content/brands");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const [, frontmatter, body] = match;
  const data = {};
  const lines = frontmatter.split(/\r?\n/);

  let currentKey = null;
  let inArray = false;
  let arrayValues = [];

  function commitArray() {
    if (currentKey && inArray) {
      data[currentKey] = arrayValues.slice();
    }
    currentKey = null;
    inArray = false;
    arrayValues = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "    ");
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (inArray && /^\s*-\s+/.test(line)) {
      const value = trimmed.replace(/^-+\s*/, "");
      arrayValues.push(stripQuotes(value));
      continue;
    }

    if (/^[A-Za-z0-9_-]+\s*:/.test(trimmed)) {
      commitArray();

      const idx = trimmed.indexOf(":");
      const key = trimmed.slice(0, idx).trim();
      const rest = trimmed.slice(idx + 1).trim();

      if (rest === "") {
        currentKey = key;
        inArray = true;
        arrayValues = [];
      } else {
        data[key] = stripQuotes(rest);
      }
      continue;
    }

    if (inArray && trimmed.startsWith("- ")) {
      const value = trimmed.slice(2).trim();
      arrayValues.push(stripQuotes(value));
    }
  }

  commitArray();

  return { data, body: body.trim() };
}

function stripQuotes(value = "") {
  return value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

export function slugifyCategory(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
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

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];
  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildItemFromMarkdown(filePath, keyName = "title") {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, body } = parseFrontmatter(raw);

  const filenameSlug = path.basename(filePath, ".md");
  const lang = data.lang || inferLangFromPath(filePath);

  const title = data.title || data.name || "";
  const name = data.name || "";
  const category = data.category || "";
  const cover = data.cover || "";
  const date = data.date || "";
  const publish_at = data.publish_at || "";

  return {
    slug: data.slug || filenameSlug,
    original_slug: data.original_slug || data.slug || filenameSlug,
    lang,
    title,
    name,
    category,
    category_slug: data.category_slug || slugifyCategory(category),
    author: data.author || "AKOMARO Editorial",
    country: data.country || "",
    date,
    publish_at,
    excerpt: data.excerpt || "",
    body,
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
    seo_description: data.seo_description || data.excerpt || "",
    sponsor: data.sponsor || "",
    cta_text: data.cta_text || "",
    cta_link: data.cta_link || "",
    status: data.status || "published",
    source_path: filePath
  };
}

function readMarkdownCollection(baseDir, keyName = "title") {
  const files = getMarkdownFiles(baseDir);
  const items = files.map((filePath) => buildItemFromMarkdown(filePath, keyName));

  return items.sort((a, b) => {
    const aTime = getTimeValue(a.publish_at || a.date);
    const bTime = getTimeValue(b.publish_at || b.date);
    return bTime - aTime;
  });
}

export function getAllPosts() {
  return readMarkdownCollection(POSTS_DIR, "title");
}

export function getPublishedPosts(lang = null) {
  return getAllPosts().filter((post) => {
    const langMatch = !lang || post.lang === lang;
    const statusOk = !post.status || post.status === "published" || post.status === "publish";
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
    const slug = post.category_slug || slugifyCategory(post.category || "all");
    const name = post.category || defaultAllLabel(lang);

    if (!map.has(slug)) {
      map.set(slug, { slug, name, count: 1 });
    } else {
      map.get(slug).count += 1;
    }
  }

  const categories = Array.from(map.values());

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
    const slug = post.category_slug || slugifyCategory(post.category || "");
    return slug === categorySlug;
  });
}

export function getAllBrands() {
  return readMarkdownCollection(BRANDS_DIR, "name");
}

export function getPublishedBrands(lang = null) {
  return getAllBrands().filter((brand) => {
    const langMatch = !lang || brand.lang === lang;
    const statusOk = !brand.status || brand.status === "published" || brand.status === "publish";
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
