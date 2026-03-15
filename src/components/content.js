import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "src/content/posts");

export function getAllPosts() {
  const files = fs.readdirSync(postsDirectory);

  const posts = files.map((file) => {
    const slug = file.replace(".md", "");

    const fullPath = path.join(postsDirectory, file);
    const fileContents = fs.readFileSync(fullPath, "utf8");

    const { data, content } = matter(fileContents);

    return {
      slug,
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
      body: content
    };
  });

  return posts;
}

export function getCategories() {
  const posts = getAllPosts();

  const categoryMap = {};

  posts.forEach((post) => {
    const slug = post.category
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (!categoryMap[slug]) {
      categoryMap[slug] = {
        slug,
        name: post.category,
        count: 0
      };
    }

    categoryMap[slug].count++;
  });

  return Object.values(categoryMap);
}
