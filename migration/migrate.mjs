import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { htmlToMarkdown, replaceEmbeds, sanitizeFilename, frontmatter } from "./lib/transform.mjs";

const BLOBS = "legacy-s4hs/storage/s3";
const data = JSON.parse(readFileSync("migration/export.json", "utf8"));

function copyBlob(ref, collection) {
  if (!ref) return undefined;
  const file = sanitizeFilename(ref.filename);
  const destDir = join("src/assets/images", collection);
  mkdirSync(destDir, { recursive: true });
  copyFileSync(join(BLOBS, ref.key), join(destDir, file));
  return file; // referenced from md as ../../assets/images/<collection>/<file>
}

function richToMarkdown(rich, collection) {
  if (!rich) return "";
  for (const e of rich.embeds ?? []) copyBlob(e, collection);
  return htmlToMarkdown(replaceEmbeds(rich.html, rich.embeds ?? [])).trim();
}

function assetPath(collection, file) {
  return file ? `../../assets/images/${collection}/${file}` : undefined;
}

function resetDir(p) { if (existsSync(p)) rmSync(p, { recursive: true }); mkdirSync(p, { recursive: true }); }

resetDir("src/content/authors");
resetDir("src/content/posts");
resetDir("src/content/publications");

for (const a of data.authors) {
  const avatar = copyBlob(a.avatar, "authors");
  const fm = frontmatter({
    firstName: a.firstName, middleName: a.middleName || undefined, lastName: a.lastName,
    titleBefore: a.titleBefore || undefined, titleAfter: a.titleAfter || undefined,
    website: a.website || undefined, facebook: a.facebook || undefined, linkedin: a.linkedin || undefined,
    avatar: assetPath("authors", avatar), createdAt: new Date(a.createdAt),
  });
  writeFileSync(join("src/content/authors", `${a.slug}.md`), fm + richToMarkdown(a.bio, "authors") + "\n");
}

for (const p of data.posts) {
  const image = copyBlob(p.image, "posts");
  const fm = frontmatter({
    title: p.title, author: p.authorSlug, publishedAt: new Date(p.publishedAt),
    description: richToMarkdown(p.description, "posts"), image: assetPath("posts", image),
  });
  writeFileSync(join("src/content/posts", `${p.slug}.md`), fm + richToMarkdown(p.content, "posts") + "\n");
}

for (const pub of data.publications) {
  const image = copyBlob(pub.image, "publications");
  const gallery = (pub.gallery ?? []).map((g) => assetPath("publications", copyBlob(g, "publications")));
  const fm = frontmatter({
    title: pub.title, shortDescription: richToMarkdown(pub.shortDescription, "publications"),
    image: assetPath("publications", image), gallery, createdAt: new Date(pub.createdAt),
  });
  writeFileSync(join("src/content/publications", `${pub.slug}.md`),
    fm + richToMarkdown(pub.longDescription, "publications") + "\n");
}

console.log("done:", data.authors.length, "authors,", data.posts.length, "posts,", data.publications.length, "publications");
