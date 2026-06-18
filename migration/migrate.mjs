import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { htmlToMarkdown, sanitizeFilename, frontmatter } from "./lib/transform.mjs";

const BLOBS = "legacy-s4hs/storage/s3";
const data = JSON.parse(readFileSync("migration/export.json", "utf8"));

// Finding 3: idempotency — remove stale images before regenerating
rmSync("src/assets/images", { recursive: true, force: true });

const assignedByKey = new Map();   // blob key -> file (relative within collection)
const usedNames = new Map();       // `${collection}/${file}` -> owning blob key

function copyBlob(ref, collection) {
  if (!ref) return undefined;
  if (assignedByKey.has(ref.key)) return assignedByKey.get(ref.key);  // same image already copied
  let file = sanitizeFilename(ref.filename);
  let candidate = `${collection}/${file}`;
  if (usedNames.has(candidate) && usedNames.get(candidate) !== ref.key) {
    const dot = file.lastIndexOf(".");
    const suffix = ref.key.slice(0, 6);
    file = dot > 0 ? `${file.slice(0, dot)}-${suffix}${file.slice(dot)}` : `${file}-${suffix}`;
    candidate = `${collection}/${file}`;
  }
  usedNames.set(candidate, ref.key);
  assignedByKey.set(ref.key, file);
  const destDir = join("src/assets/images", collection);
  mkdirSync(destDir, { recursive: true });
  copyFileSync(join(BLOBS, ref.key), join(destDir, file));
  return file;
}

function richToMarkdown(rich, collection) {
  if (!rich) return "";
  // Finding 2: replace embed tags with correct relative path before turndown
  let html = rich.html ?? "";
  let i = 0;
  html = html.replace(/<action-text-attachment\b[^>]*>(?:<\/action-text-attachment>)?/gi, () => {
    const e = (rich.embeds ?? [])[i++];
    if (!e) return "";
    const file = copyBlob(e, collection);
    return `<img src="../../assets/images/${collection}/${file}" alt="${e.filename.replace(/"/g, "")}">`;
  });
  return htmlToMarkdown(html).trim();
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
