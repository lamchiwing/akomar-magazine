import fs from "fs";
import path from "path";

export function getAllPosts() {
  const base = "src/content/posts";

  const langs = ["zh-hk", "zh-cn", "ja", "ko"];
  let all = [];

  langs.forEach(lang => {
    const dir = path.join(base, lang);
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const [frontmatter, content] = raw.split("---").slice(1);

      const data = parseFrontmatter(frontmatter);

      const publishTime = new Date(data.publish_at || data.date);

      if (publishTime <= new Date()) {
        all.push({
          ...data,
          body: content,
          lang
        });
      }
    });
  });

  return all;
}

function parseFrontmatter(str) {
  const lines = str.split("\n");
  const obj = {};

  lines.forEach(line => {
    const [key, ...rest] = line.split(":");
    if (!key) return;
    obj[key.trim()] = rest.join(":").trim().replace(/"/g, "");
  });

  return obj;
}
