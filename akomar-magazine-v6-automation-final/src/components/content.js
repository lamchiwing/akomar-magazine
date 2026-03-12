import fs from "node:fs";
import path from "node:path";

const POSTS_DIR = path.resolve("src/content/posts");

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
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export function getAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data, body } = parseFrontmatter(raw);
    return {
      slug: file.replace(/\.md$/, ""),
      title: data.title || "",
      date: data.date || "",
      author: data.author || "AKOMAR 編輯部",
      category: data.category || "Insights",
      excerpt: data.excerpt || "",
      cover: data.cover || "",
      cover_caption: data.cover_caption || "",
      image1: data.image1 || "",
      image1_caption: data.image1_caption || "",
      image2: data.image2 || "",
      image2_caption: data.image2_caption || "",
      image3: data.image3 || "",
      image3_caption: data.image3_caption || "",
      og_image: data.og_image || data.cover || "",
      body
    };
  });
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getPostBySlug(slug) {
  return getAllPosts().find((post) => post.slug === slug);
}

export function getPostsByCategory(categorySlug) {
  return getAllPosts().filter((post) => slugifyCategory(post.category) === categorySlug);
}

export function getCategories() {
  const map = new Map();
  for (const post of getAllPosts()) {
    const slug = slugifyCategory(post.category);
    if (!map.has(slug)) map.set(slug, { slug, name: post.category, count: 1 });
    else map.get(slug).count += 1;
  }
  return Array.from(map.values());
}
