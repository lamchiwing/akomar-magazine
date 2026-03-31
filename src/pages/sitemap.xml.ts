import { SUPPORTED_LANGS, getPublishedPosts, getPostCategories, getPublishedBrands } from "../components/content.js";

export async function GET() {
  const site = "https://magazine.akomaro.com";

  const staticUrls = [
    `${site}/`,
    ...SUPPORTED_LANGS.flatMap((lang) => [
      `${site}/${lang}/`,
      `${site}/${lang}/brands/`,
      `${site}/${lang}/enquiry/`
    ])
  ];

  const postUrls = getPublishedPosts().map((post) => `${site}/${post.lang}/post/${post.slug}`);
  const brandUrls = getPublishedBrands().map((brand) => `${site}/${brand.lang}/brand/${brand.slug}`);
  const categoryUrls = SUPPORTED_LANGS.flatMap((lang) =>
    getPostCategories(lang).map((cat) => `${site}/${lang}/category/${cat.slug}`)
  );

  const urls = [...new Set([...staticUrls, ...postUrls, ...brandUrls, ...categoryUrls])];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" }
  });
}
