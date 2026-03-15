import { getPublishedPosts, getCategories } from "../components/content.js";

export async function GET() {
  const site = "https://magazine.akomar.com";

  const posts = getPublishedPosts();
  const categories = getCategories();

  const postUrls = posts
    .map(
      (post) => `
      <url>
        <loc>${site}/post/${post.slug}</loc>
        <lastmod>${post.publish_at || post.date}</lastmod>
      </url>
    `
    )
    .join("");

  const categoryUrls = categories
    .map(
      (cat) => `
      <url>
        <loc>${site}/category/${cat.slug}</loc>
      </url>
    `
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

    <url>
      <loc>${site}</loc>
    </url>

    ${postUrls}

    ${categoryUrls}

  </urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml"
    }
  });
}
