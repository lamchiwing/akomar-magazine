import { getPublishedPosts } from "../components/content.js";

export async function GET() {
  const posts = getPublishedPosts();

  const site = "https://magazine.akomar.com";

  const items = posts
    .map((post) => `
      <item>
        <title>${post.title}</title>
        <link>${site}/post/${post.slug}</link>
        <guid>${site}/post/${post.slug}</guid>
        <pubDate>${new Date(post.publish_at || post.date).toUTCString()}</pubDate>
        <description><![CDATA[${post.excerpt}]]></description>
      </item>
    `)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
      <title>AKOMAR Automation Magazine</title>
      <link>${site}</link>
      <description>Automation strategy, market entry and signal analysis.</description>
      ${items}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml"
    }
  });
}
