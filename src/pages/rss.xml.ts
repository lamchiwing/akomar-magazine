import { getPublishedPosts } from "../components/content.js";

export async function GET() {
  const posts = getPublishedPosts();
  const site = "https://magazine.akomaro.com";

  const items = posts
    .map((post) => `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${site}/${post.lang}/post/${post.slug}</link>
        <guid>${site}/${post.lang}/post/${post.slug}</guid>
        <pubDate>${new Date(post.publish_at || post.date).toUTCString()}</pubDate>
        <description><![CDATA[${post.excerpt || ""}]]></description>
      </item>`)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
      <title>AKOMARO Magazine</title>
      <link>${site}</link>
      <description>Curated European brands, stories, and collections.</description>
      ${items}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" }
  });
}
