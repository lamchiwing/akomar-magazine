import fs from "fs";
import path from "path";

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

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
      const { data, body } = parseFrontmatter(raw);

      return {
        slug: file.replace(/\.md$/, ""),
        title: data.title || "",
        date: data.date || "",
        publish_at: data.publish_at || "",
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
    })
    .sort((a, b) => {
      const aTime = new Date(a.publish_at || a.date).getTime();
      const bTime = new Date(b.publish_at || b.date).getTime();
      return bTime - aTime;
    });
}

export function isPublished(post) {
  const publishTime = new Date(post.publish_at || post.date);
  return publishTime <= new Date();
}

export function getPublishedPosts() {
  return getAllPosts().filter(isPublished);
}

export function getPostBySlug(slug) {
  return getAllPosts().find((post) => post.slug === slug);
}

export function getPublishedPostBySlug(slug) {
  return getPublishedPosts().find((post) => post.slug === slug);
}

export function getPostsByCategory(categorySlug) {
  return getPublishedPosts().filter(
    (post) => slugifyCategory(post.category) === categorySlug
  );
}

export function getCategories() {
  const map = new Map();

  for (const post of getPublishedPosts()) {
    const slug = slugifyCategory(post.category);

    if (!map.has(slug)) {
      map.set(slug, {
        slug,
        name: post.category,
        count: 1
      });
    } else {
      map.get(slug).count += 1;
    }
  }

  return Array.from(map.values());
}
