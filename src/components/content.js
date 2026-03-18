import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "src/content/posts");

export function getPublishedPosts() {
  const files = fs.readdirSync(postsDirectory);

  const posts = files.map((file) => {
    const filePath = path.join(postsDirectory, file);
    const content = fs.readFileSync(filePath, "utf8");

    const { data, content: body } = matter(content);

    return {
      ...data,
      body,
      slug: data.slug
    };
  });

  return posts
    .filter(p => new Date(p.publish_at || p.date) <= new Date())
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
