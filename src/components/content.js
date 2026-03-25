import fs from "fs";
import path from "path";

export const SUPPORTED_LANGS = ["zh-hk", "zh-cn", "ja", "ko"];
const POSTS_DIR = path.resolve("src/content/posts");
const BRANDS_DIR = path.resolve("src/content/brands");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const [, frontmatter, body] = match;
  const data = {};

  for (const line of frontmatter.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    data[key] = value;
  }

  return { data, body };
}

export function slugifyCategory(value = "") {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export function isPublished(item) {
  const publishTime = new Date(item.publish_at || item.date);
  return publishTime <= new Date();
}

function readMarkdownCollection(baseDir, keyName = "title") {
  const all = [];

  for (const lang of SUPPORTED_LANGS) {
    const dir = path.join(baseDir, lang);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data, body } = parseFrontmatter(raw);

      all.push({
        slug: data.slug || file.replace(/\.md$/, ""),
        original_slug: data.original_slug || data.slug || file.replace(/\.md$/, ""),
        lang: data.lang || lang,
        title: data.title || data.name || "",
        name: data.name || "",
        category: data.category || "",
        author: data.author || "AKOMARO Editorial",
        country: data.country || "",
        date: data.date || "",
        publish_at: data.publish_at || "",
        excerpt: data.excerpt || "",
        body,
        cover: data.cover || "",
        cover_caption: data.cover_caption || "",
        image1: data.image1 || "",
        image1_caption: data.image1_caption || "",
        image2: data.image2 || "",
        image2_caption: data.image2_caption || "",
        image3: data.image3 || "",
        image3_caption: data.image3_caption || "",
        logo: data.logo || "",
        og_image: data.og_image || data.cover || "",
        website: data.website || "",
        tags: data.tags || "",
        seo_title: data.seo_title || data[keyName] || data.title || data.name || "",
        seo_description: data.seo_description || data.excerpt || "",
        sponsor: data.sponsor || "",
        cta_text: data.cta_text || "",
        cta_link: data.cta_link || ""
      });
    }
  }

  return all.sort((a, b) => {
    const aTime = new Date(a.publish_at || a.date).getTime();
    const bTime = new Date(b.publish_at || b.date).getTime();
    return bTime - aTime;
  });
}

export function getAllPosts() {
  return readMarkdownCollection(POSTS_DIR, "title");
}

export function getPublishedPosts(lang = null) {
  return getAllPosts().filter((post) => isPublished(post) && (!lang || post.lang === lang));
}

export function getPublishedPostBySlug(lang, slug) {
  return getPublishedPosts(lang).find((post) => post.slug === slug);
}

export function getPostCategories(lang) {
  const map = new Map();
  for (const post of getPublishedPosts(lang)) {
    const slug = slugifyCategory(post.category);
    if (!map.has(slug)) {
      map.set(slug, { slug, name: post.category, count: 1 });
    } else {
      map.get(slug).count += 1;
    }
  }
  return Array.from(map.values());
}

export function getPostsByCategory(lang, categorySlug) {
  return getPublishedPosts(lang).filter(
    (post) => slugifyCategory(post.category) === categorySlug
  );
}

export function getAllBrands() {
  return readMarkdownCollection(BRANDS_DIR, "name");
}

export function getPublishedBrands(lang = null) {
  return getAllBrands().filter((brand) => isPublished(brand) && (!lang || brand.lang === lang));
}

export function getPublishedBrandBySlug(lang, slug) {
  return getPublishedBrands(lang).find((brand) => brand.slug === slug);
}

export function getAlternates(type, originalSlug) {
  const source = type === "brand" ? getAllBrands() : getAllPosts();
  return source
    .filter((item) => item.original_slug === originalSlug && isPublished(item))
    .map((item) => ({ lang: item.lang, slug: item.slug }));
}
