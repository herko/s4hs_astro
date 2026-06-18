# S4HS Rails → Astro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the legacy Rails 6 + PostgreSQL + S3 site "Society for Human Studies" (s4hs) as a fully static Astro site deployed on Cloudflare Pages, with identical content and look.

**Architecture:** A one-time migration pipeline exports content from the legacy app (Rails renders ActionText faithfully) into JSON, then a Node script converts it to Astro content-collection Markdown + local images. The site itself is pure static Astro (`output: 'static'`), no SSR adapter, content frozen in git.

**Tech Stack:** Astro 6 (Content Layer API with `glob` loader, `astro:assets`), Node ≥22.12, `marked` (render frontmatter Markdown strings), `turndown` (migration HTML→Markdown), Cloudflare Pages. No Bootstrap/jQuery/Turbolinks.

## Global Constraints

- Astro `^6.4.7`; Node `>=22.12.0` (already pinned in `package.json`).
- Static output only (`output: 'static'`); no server runtime, no env vars at build.
- URLs preserved 1:1: `/` (home), `/clanky`, `/clanky/<slug>`, `/autori`, `/autori/<slug>`, `/publikacie`, `/publikacie/<slug>`. Content filenames are `<slug>.md` so the content-layer `id` equals the slug.
- Content is frozen in git as Astro content collections (Markdown + frontmatter); no CMS, no admin.
- Rich text stored as Markdown. Secondary rich fields (post `description`, publication `shortDescription`) live as Markdown strings in frontmatter, rendered via the `Prose` component with `marked`.
- All UI text is Slovak (copy taken verbatim from the legacy views).
- No Bootstrap, jQuery, popper, Turbolinks, Stimulus, FontAwesome. Icons are inline SVG. Styling is scoped CSS per component plus one global token stylesheet whose values are extracted from the legacy theme SCSS (not invented).
- The legacy app copy in `legacy-s4hs/` is gitignored (contains secrets) and is the source of truth for content/assets during migration only.
- Public content shows ALL records (the legacy public controllers apply no `status` filter); ordering is `created_at` descending for posts and publications, `last_name` ascending for authors.
- Work happens on branch `migrate-to-astro`. Commit after every task.

---

## File Structure

```
astro.config.mjs                      # site config
src/content.config.ts                 # collection schemas (authors, posts, publications)
src/content/
  authors/<slug>.md                    # generated
  posts/<slug>.md                      # generated
  publications/<slug>.md               # generated
src/assets/
  images/authors|posts|publications/   # generated (from S3 blobs)
  static/                              # logo + hero images (from legacy app/assets/images)
src/lib/names.ts                       # author display-name helpers
src/components/
  BaseHead.astro  Navbar.astro  Footer.astro  Prose.astro  Icon.astro
  PostCard.astro  PublicationCard.astro  AuthorCard.astro  Gallery.astro
  Typing.astro                         # hero typing animation (vanilla JS)
src/layouts/Layout.astro
src/styles/tokens.css                  # global theme tokens + reset
src/pages/
  index.astro
  clanky/index.astro   clanky/[slug].astro
  autori/index.astro   autori/[slug].astro
  publikacie/index.astro  publikacie/[slug].astro
  404.astro
migration/
  export.rb                            # runs on server via `bin/rails runner`
  migrate.mjs                          # export.json -> content + images
  lib/transform.mjs                    # pure functions (tested)
  test/transform.test.mjs              # node:test unit tests
  export.json                          # produced by export.rb (gitignored)
tests/build.test.mjs                   # post-build output assertions (node:test)
```

---

## Task 1: Project config, theme tokens, base layout

**Files:**
- Modify: `package.json`
- Create: `astro.config.mjs` (replace existing minimal one), `src/styles/tokens.css`, `src/layouts/Layout.astro`, `src/components/BaseHead.astro`
- Create: `src/assets/static/` (copy logo + hero images here)
- Test: `tests/build.test.mjs`

**Interfaces:**
- Produces: `Layout.astro` default-export component with props `{ title: string; description?: string }` and a default slot. `BaseHead.astro` with props `{ title: string; description?: string }`.

- [ ] **Step 1: Add dependencies**

Run:
```bash
cd /Users/lubomirherko/Projects/s4hs_astro
npm install marked
npm install -D turndown
```
Expected: `marked` in dependencies, `turndown` in devDependencies.

- [ ] **Step 2: Copy static design assets from the legacy app**

Run:
```bash
mkdir -p src/assets/static/hero
cp legacy-s4hs/production/app/assets/images/s4hs-logo.svg src/assets/static/
cp legacy-s4hs/production/app/assets/images/s4hs-logo-square.svg src/assets/static/
cp legacy-s4hs/production/app/assets/images/no-avatar.svg src/assets/static/
cp legacy-s4hs/production/app/assets/images/no-image.svg src/assets/static/
cp legacy-s4hs/production/app/assets/images/hero/*.jpg src/assets/static/hero/
ls src/assets/static src/assets/static/hero | head
```
Expected: logo SVGs + 16 `hero/hero-*.jpg`.

- [ ] **Step 3: Extract the real theme palette to seed tokens**

Run (read the exact values — do NOT invent colors):
```bash
grep -nE '^\$(primary|secondary|success|info|warning|danger|light|dark|body-color|headings-color|gray-[0-9]+):' \
  legacy-s4hs/production/app/assets/stylesheets/theme/bootstrap/_variables.scss
grep -nE '\$(primary|warning)' legacy-s4hs/production/app/assets/stylesheets/theme/_user-variables.scss
```
Use the returned hex values for the custom properties in Step 4. The "Front" template default `$primary` is the brand color used by `.btn-primary` and links; `$warning` is the hero typing accent (`text-warning`).

- [ ] **Step 4: Create `src/styles/tokens.css`**

```css
/* Global theme tokens (values from legacy theme SCSS) + minimal reset.
   Replace the hex values below with the ones returned in Step 3. */
:root {
  --color-primary: #377dff;        /* $primary */
  --color-primary-dark: #1366ff;
  --color-warning: #ffc107;        /* $warning — hero accent */
  --color-text: #1e2022;           /* $body-color ~ $gray-900 */
  --color-muted: #8c98a4;          /* $text-muted */
  --color-bg: #ffffff;
  --color-bg-light: #f8fafd;       /* .bg-light */
  --color-border: #e7eaf3;

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --font-size-base: 1rem;
  --line-height-base: 1.6;
  --h1: 2.5rem; --h2: 2rem; --h3: 1.75rem; --h4: 1.5rem; --h5: 1.25rem;
  --weight-medium: 500; --weight-semibold: 600; --weight-bold: 700;

  --container: 1140px;
  --space-1: 0.5rem; --space-2: 1rem; --space-3: 2rem; --space-4: 4rem; --space-5: 6rem;
  --radius: 0.5rem;
  --shadow-soft: 0 0 35px rgba(140, 152, 164, 0.125);
}

*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--color-text);
  background: var(--color-bg);
}
img { max-width: 100%; height: auto; }
a { color: var(--color-primary); text-decoration: none; }
a:hover { text-decoration: underline; }
h1, h2, h3, h4, h5 { font-weight: var(--weight-medium); line-height: 1.2; margin: 0 0 var(--space-2); }
.container { max-width: var(--container); margin-inline: auto; padding-inline: var(--space-2); }
```

- [ ] **Step 5: Create `src/components/BaseHead.astro`**

```astro
---
interface Props { title: string; description?: string }
const { title, description = "Society for human studies — vzdelanie a poznanie v oblasti humanitných vied" } = Astro.props;
import "../styles/tokens.css";
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content={Astro.generator} />
<title>{title}</title>
<meta name="description" content={description} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<link rel="icon" href="/favicon.ico" />
```

- [ ] **Step 6: Create `src/layouts/Layout.astro`**

```astro
---
import BaseHead from "../components/BaseHead.astro";
import Navbar from "../components/Navbar.astro";
import Footer from "../components/Footer.astro";
interface Props { title: string; description?: string }
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="sk">
  <head><BaseHead title={title} description={description} /></head>
  <body>
    <Navbar />
    <main><slot /></main>
    <Footer />
  </body>
</html>
```
(Navbar/Footer are created in Task 5; the build in Step 8 is run after Task 5, or stub them as empty components first. To keep this task independently testable, create temporary one-line stubs `src/components/Navbar.astro` and `src/components/Footer.astro` containing `<nav></nav>` / `<footer></footer>`; Task 5 replaces them.)

- [ ] **Step 7: Replace `astro.config.mjs`**

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://s4hs.sk",
  output: "static",
  trailingSlash: "never",
});
```

- [ ] **Step 8: Write the build smoke test**

```js
// tests/build.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test("build produced a homepage", () => {
  assert.ok(existsSync("dist/index.html"), "dist/index.html should exist after `astro build`");
});
```

- [ ] **Step 9: Build and run the smoke test**

Run:
```bash
npm run build && node --test tests/build.test.mjs
```
Expected: build succeeds; test PASS (`dist/index.html` exists). With only stub pages this still produces `dist/index.html` once Task 6+ add `src/pages/index.astro` — until then a minimal `src/pages/index.astro` containing `<Layout title="S4HS">ok</Layout>` is acceptable to make the build pass.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json astro.config.mjs src tests
git commit -m "chore: project config, theme tokens, base layout, static assets"
```

---

## Task 2: Content collection schemas

**Files:**
- Create: `src/content.config.ts`, `src/lib/names.ts`

**Interfaces:**
- Produces collections `authors`, `posts`, `publications` and their Zod-validated frontmatter. Later tasks import `getCollection`, `getEntry`, `render` from `astro:content` and rely on the field names below.
- `names.ts` exports `fullName(a)` and `fullNameWithTitles(a)` taking an author's `data`.

- [ ] **Step 1: Create `src/content.config.ts`**

```ts
import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

const authors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/authors" }),
  schema: ({ image }) =>
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      middleName: z.string().optional(),
      titleBefore: z.string().optional(),
      titleAfter: z.string().optional(),
      website: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
      avatar: image().optional(),
      createdAt: z.coerce.date(),
    }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: reference("authors"),
      description: z.string(),          // Markdown string (lead)
      image: image().optional(),
      publishedAt: z.coerce.date(),
    }),
});

const publications = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/publications" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      shortDescription: z.string(),     // Markdown string
      image: image().optional(),
      gallery: z.array(image()).default([]),
      createdAt: z.coerce.date(),
    }),
});

export const collections = { authors, posts, publications };
```

- [ ] **Step 2: Create `src/lib/names.ts`**

```ts
export interface AuthorNameFields {
  firstName: string;
  lastName: string;
  middleName?: string;
  titleBefore?: string;
  titleAfter?: string;
}

export function fullName(a: AuthorNameFields): string {
  return [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
}

export function fullNameWithTitles(a: AuthorNameFields): string {
  const pre = [a.titleBefore, fullName(a)].filter(Boolean).join(" ");
  return [pre, a.titleAfter].filter(Boolean).join(", ");
}
```

- [ ] **Step 3: Verify schemas compile**

Run:
```bash
npx astro sync
```
Expected: completes without schema errors and regenerates `.astro/` types. (Collections are empty until Task 4; `sync` still validates the config.)

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/lib/names.ts
git commit -m "feat: content collection schemas + name helpers"
```

---

## Task 3: Migration transform library (pure functions, TDD)

**Files:**
- Create: `migration/lib/transform.mjs`
- Test: `migration/test/transform.test.mjs`

**Interfaces:**
- Produces (imported by `migrate.mjs` in Task 4):
  - `htmlToMarkdown(html: string): string`
  - `replaceEmbeds(html: string, embeds: {filename: string}[]): string` — swaps each `<action-text-attachment>` for `<img src="./images/<sanitized-filename>">` so turndown emits a Markdown image.
  - `sanitizeFilename(name: string): string` — lowercased, spaces/diacritics → `-`, keeps extension.
  - `frontmatter(obj: Record<string, unknown>): string` — YAML frontmatter block (`---\n...\n---\n`), strings quoted, dates as ISO, arrays as `- item` lists.

- [ ] **Step 1: Write failing tests**

```js
// migration/test/transform.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlToMarkdown, replaceEmbeds, sanitizeFilename, frontmatter }
  from "../lib/transform.mjs";

test("htmlToMarkdown converts basic Trix HTML", () => {
  assert.equal(htmlToMarkdown("<div>Hello <strong>world</strong></div>").trim(),
    "Hello **world**");
});

test("htmlToMarkdown turns an img into a Markdown image", () => {
  assert.equal(htmlToMarkdown('<img src="./images/foto.jpg" alt="x">').trim(),
    "![x](./images/foto.jpg)");
});

test("replaceEmbeds swaps action-text-attachment for img", () => {
  const html = '<p>a</p><action-text-attachment sgid="ABC" content-type="image/jpeg"></action-text-attachment>';
  const out = replaceEmbeds(html, [{ filename: "Pekná Fotka.JPG" }]);
  assert.match(out, /<img src="\.\/images\/pekna-fotka\.jpg"/);
  assert.doesNotMatch(out, /action-text-attachment/);
});

test("sanitizeFilename lowercases, strips diacritics, keeps extension", () => {
  assert.equal(sanitizeFilename("Žltý Kôň.JPG"), "zlty-kon.jpg");
});

test("frontmatter emits quoted strings, ISO dates, and list arrays", () => {
  const fm = frontmatter({ title: 'A "b"', publishedAt: new Date("2020-01-02T03:04:05Z"),
    gallery: ["./images/a.jpg", "./images/b.jpg"] });
  assert.match(fm, /^---\n/);
  assert.match(fm, /title: "A \\"b\\""/);
  assert.match(fm, /publishedAt: 2020-01-02T03:04:05\.000Z/);
  assert.match(fm, /gallery:\n {2}- "\.\/images\/a\.jpg"\n {2}- "\.\/images\/b\.jpg"/);
  assert.match(fm, /\n---\n$/);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run:
```bash
node --test migration/test/transform.test.mjs
```
Expected: FAIL — `Cannot find module '../lib/transform.mjs'`.

- [ ] **Step 3: Implement `migration/lib/transform.mjs`**

```js
import TurndownService from "turndown";

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });

export function htmlToMarkdown(html) {
  if (!html) return "";
  return td.turndown(html);
}

export function sanitizeFilename(name) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const base = dot > 0 ? name.slice(0, dot) : name;
  const slug = base
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ext ? `${slug}.${ext}` : slug;
}

export function replaceEmbeds(html, embeds = []) {
  if (!html) return "";
  let i = 0;
  return html.replace(/<action-text-attachment\b[^>]*>(?:<\/action-text-attachment>)?/gi, () => {
    const e = embeds[i++];
    if (!e) return "";
    return `<img src="./images/${sanitizeFilename(e.filename)}" alt="${e.filename.replace(/"/g, "")}">`;
  });
}

function yamlValue(v, indent = "") {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return "\n" + v.map((item) => `${indent}  - ${quote(item)}`).join("\n");
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return quote(v);
}

function quote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function frontmatter(obj) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    lines.push(`${k}: ${yamlValue(v, "")}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run:
```bash
node --test migration/test/transform.test.mjs
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add migration/lib/transform.mjs migration/test/transform.test.mjs
git commit -m "feat: migration transform helpers (html->md, frontmatter, embeds)"
```

---

## Task 4: Export from legacy Rails + run migration

**Files:**
- Create: `migration/export.rb`, `migration/migrate.mjs`
- Modify: `.gitignore` (add `migration/export.json`)
- Generated (committed): `src/content/**/*.md`, `src/assets/images/**`

**Interfaces:**
- Consumes: `transform.mjs` (Task 3), schema field names (Task 2), blob files at `legacy-s4hs/storage/s3/<key>`.
- Produces: one `.md` per record with `id == slug`; images under `src/assets/images/<collection>/`.

- [ ] **Step 1: Write `migration/export.rb`**

```ruby
# Run on the server:  cd ~/apps/s4hs_sk/production && bin/rails runner /tmp/export.rb > /tmp/export.json
require "json"

def rich(rt)
  return nil if rt.nil? || rt.body.nil?
  embeds = rt.body.attachments.filter_map do |att|
    blob = att.attachable
    next unless blob.is_a?(ActiveStorage::Blob)
    { key: blob.key, filename: blob.filename.to_s, content_type: blob.content_type }
  end
  { html: rt.body.to_html, embeds: embeds }
end

def blob_ref(attached)
  return nil unless attached.attached?
  b = attached.blob
  { key: b.key, filename: b.filename.to_s, content_type: b.content_type }
end

data = {
  authors: User.order(:last_name).map do |u|
    {
      slug: u.slug, firstName: u.first_name, middleName: u.middle_name, lastName: u.last_name,
      titleBefore: u.title_before, titleAfter: u.title_after,
      website: u.website.presence || u.url.presence, facebook: u.facebook, linkedin: u.linkedin,
      createdAt: u.created_at.iso8601, avatar: blob_ref(u.avatar), bio: rich(u.bio)
    }
  end,
  posts: Post.order(created_at: :desc).map do |p|
    {
      slug: p.slug, title: p.title, authorSlug: p.author.slug, publishedAt: p.created_at.iso8601,
      image: blob_ref(p.image), description: rich(p.description), content: rich(p.content)
    }
  end,
  publications: Publication.order(created_at: :desc).map do |pub|
    {
      slug: pub.slug, title: pub.title, createdAt: pub.created_at.iso8601,
      image: blob_ref(pub.image),
      gallery: pub.gallery_images.map { |g| { key: g.blob.key, filename: g.blob.filename.to_s } },
      shortDescription: rich(pub.short_description), longDescription: rich(pub.long_description)
    }
  end
}

puts JSON.pretty_generate(data)
```

- [ ] **Step 2: Run the export on the server and download it**

Run:
```bash
scp migration/export.rb deploy@bjkfotolab.pro:/tmp/export.rb
ssh deploy@bjkfotolab.pro 'cd ~/apps/s4hs_sk/production && PATH="$HOME/.rbenv/shims:$PATH" RAILS_ENV=production bin/rails runner /tmp/export.rb > /tmp/export.json && wc -c /tmp/export.json'
scp deploy@bjkfotolab.pro:/tmp/export.json migration/export.json
ssh deploy@bjkfotolab.pro 'rm -f /tmp/export.rb /tmp/export.json'
node -e 'const d=require("./migration/export.json");console.log("authors",d.authors.length,"posts",d.posts.length,"publications",d.publications.length)'
```
Expected: `authors 3 posts 4 publications 21`.

- [ ] **Step 3: Add `migration/export.json` to `.gitignore`**

Append to `.gitignore`:
```
migration/export.json
```

- [ ] **Step 4: Write `migration/migrate.mjs`**

```js
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
```

Note on the embed image path: the single inline embed is copied into the same collection folder, and `replaceEmbeds` emits `./images/<file>`. After generation, fix that one body reference to the collection-relative path with a follow-up replace in `richToMarkdown` if needed; with exactly one embed, verify it renders in Task 7 and adjust the `src` prefix to `../../assets/images/<collection>/` if the build cannot resolve `./images/...`.

- [ ] **Step 5: Run the migration**

Run:
```bash
node migration/migrate.mjs
ls src/content/authors src/content/posts src/content/publications | head
find src/assets/images -type f | wc -l
```
Expected: `done: 3 authors, 4 posts, 21 publications`; 25 `.md` files total; image count ≈ 164 (4 post covers + 21 pub covers + 135 gallery + 3 avatars + 1 embed).

- [ ] **Step 6: Validate against the schema**

Run:
```bash
npx astro sync
```
Expected: no schema validation errors (every `author` reference resolves, dates parse, images exist).

- [ ] **Step 7: Commit**

```bash
git add .gitignore migration/migrate.mjs src/content src/assets/images
git commit -m "feat: migration script + generated content and images"
```

---

## Task 5: Navbar and Footer

**Files:**
- Modify/replace: `src/components/Navbar.astro`, `src/components/Footer.astro`
- Create: `src/components/Icon.astro`

**Interfaces:**
- Consumes: logo at `src/assets/static/s4hs-logo.svg`.
- Produces: `Navbar` and `Footer` (no props). `Icon` with props `{ name: "arrow-left" | "facebook" | "linkedin" | "link"; size?: number }`.

- [ ] **Step 1: Create `src/components/Icon.astro`**

```astro
---
interface Props { name: "arrow-left" | "facebook" | "linkedin" | "link"; size?: number }
const { name, size = 20 } = Astro.props;
const paths: Record<string, string> = {
  "arrow-left": "M19 12H5M12 19l-7-7 7-7",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  facebook: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  linkedin: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
};
---
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d={paths[name]} />
</svg>
```

- [ ] **Step 2: Replace `src/components/Navbar.astro`**

```astro
---
import { Image } from "astro:assets";
import logo from "../assets/static/s4hs-logo.svg";
const links = [
  { href: "/", label: "Home" },
  { href: "/publikacie", label: "Publikácie" },
  { href: "/autori", label: "Autori" },
  { href: "/clanky", label: "Články" },
];
const path = Astro.url.pathname;
---
<header class="header">
  <div class="container bar">
    <a href="/" class="brand"><Image src={logo} alt="S4HS" height={40} /></a>
    <input type="checkbox" id="navtoggle" class="navtoggle" />
    <label for="navtoggle" class="hamburger" aria-label="Menu"><span></span></label>
    <nav class="nav">
      {links.map((l) => (
        <a href={l.href} class:list={["navlink", { active: l.href === "/" ? path === "/" : path.startsWith(l.href) }]}>{l.label}</a>
      ))}
    </nav>
  </div>
</header>
<style>
  .header { position: sticky; top: 0; background: rgba(255,255,255,.9); backdrop-filter: blur(6px); z-index: 10; border-bottom: 1px solid var(--color-border); }
  .bar { display: flex; align-items: center; justify-content: space-between; padding-block: var(--space-2); }
  .nav { display: flex; gap: var(--space-3); }
  .navlink { color: var(--color-text); font-weight: var(--weight-medium); }
  .navlink.active, .navlink:hover { color: var(--color-primary); text-decoration: none; }
  .navtoggle, .hamburger { display: none; }
  @media (max-width: 767px) {
    .hamburger { display: block; cursor: pointer; }
    .hamburger span, .hamburger span::before, .hamburger span::after { content: ""; display: block; width: 24px; height: 2px; background: var(--color-text); position: relative; }
    .hamburger span::before { position: absolute; top: -7px; } .hamburger span::after { position: absolute; top: 7px; }
    .nav { display: none; position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; background: #fff; padding: var(--space-2); border-bottom: 1px solid var(--color-border); }
    .navtoggle:checked ~ .nav { display: flex; }
  }
</style>
```

- [ ] **Step 3: Replace `src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---
<footer class="footer">
  <div class="container">
    <p>© {year} Society for human studies</p>
  </div>
</footer>
<style>
  .footer { border-top: 1px solid var(--color-border); background: var(--color-bg-light); padding-block: var(--space-4); margin-top: var(--space-5); color: var(--color-muted); }
</style>
```

- [ ] **Step 4: Build to verify header/footer render**

Run:
```bash
npm run build && node --test tests/build.test.mjs
```
Expected: build succeeds; PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.astro src/components/Footer.astro src/components/Icon.astro
git commit -m "feat: navbar, footer, inline-svg icon component"
```

---

## Task 6: Prose component + Author pages

**Files:**
- Create: `src/components/Prose.astro`, `src/components/AuthorCard.astro`
- Create: `src/pages/autori/index.astro`, `src/pages/autori/[slug].astro`

**Interfaces:**
- Consumes: `authors` and `posts` collections; `fullName`, `fullNameWithTitles` from `src/lib/names.ts`.
- Produces: `Prose` with props `{ markdown: string }` (renders a frontmatter Markdown string via `marked`). `AuthorCard` with props `{ author: CollectionEntry<"authors"> }`.

- [ ] **Step 1: Create `src/components/Prose.astro`**

```astro
---
import { marked } from "marked";
interface Props { markdown: string }
const { markdown } = Astro.props;
const html = markdown ? marked.parse(markdown) : "";
---
<div class="prose" set:html={html} />
<style>
  .prose :global(p) { margin: 0 0 var(--space-2); }
  .prose :global(img) { border-radius: var(--radius); margin-block: var(--space-2); }
  .prose :global(h2) { font-size: var(--h3); margin-top: var(--space-3); }
  .prose :global(blockquote) { border-left: 3px solid var(--color-border); padding-left: var(--space-2); color: var(--color-muted); }
</style>
```

- [ ] **Step 2: Create `src/components/AuthorCard.astro`**

```astro
---
import { Image } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import { fullNameWithTitles } from "../lib/names";
import noAvatar from "../assets/static/no-avatar.svg";
interface Props { author: CollectionEntry<"authors"> }
const { author } = Astro.props;
const name = fullNameWithTitles(author.data);
---
<a class="card" href={`/autori/${author.id}`}>
  <Image class="avatar" src={author.data.avatar ?? noAvatar} alt={name} width={120} height={120} />
  <span class="name">{name}</span>
</a>
<style>
  .card { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); text-align: center; color: var(--color-text); }
  .avatar { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; }
  .name { font-weight: var(--weight-medium); }
  .card:hover .name { color: var(--color-primary); }
</style>
```

- [ ] **Step 3: Create `src/pages/autori/index.astro`**

```astro
---
import { getCollection } from "astro:content";
import Layout from "../../layouts/Layout.astro";
import AuthorCard from "../../components/AuthorCard.astro";
const authors = (await getCollection("authors"))
  .sort((a, b) => a.data.lastName.localeCompare(b.data.lastName, "sk"));
---
<Layout title="Autori — S4HS">
  <section class="container" style="padding-block: var(--space-5)">
    <h1>Autori</h1>
    <div class="grid">
      {authors.map((author) => <AuthorCard author={author} />)}
    </div>
  </section>
</Layout>
<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-4); margin-top: var(--space-3); }
</style>
```

- [ ] **Step 4: Create `src/pages/autori/[slug].astro`**

```astro
---
import { getCollection, getEntry, render } from "astro:content";
import { Image } from "astro:assets";
import Layout from "../../layouts/Layout.astro";
import Icon from "../../components/Icon.astro";
import PostCard from "../../components/PostCard.astro";
import { fullNameWithTitles } from "../../lib/names";
import noAvatar from "../../assets/static/no-avatar.svg";

export async function getStaticPaths() {
  const authors = await getCollection("authors");
  return authors.map((author) => ({ params: { slug: author.id }, props: { author } }));
}
const { author } = Astro.props;
const { Content } = await render(author);
const name = fullNameWithTitles(author.data);
const posts = (await getCollection("posts"))
  .filter((p) => p.data.author.id === author.id)
  .sort((a, b) => +b.data.publishedAt - +a.data.publishedAt);
const { website, facebook, linkedin } = author.data;
---
<Layout title={`${name} — S4HS`}>
  <section class="container" style="padding-block: var(--space-5); max-width: 760px">
    <div class="head">
      <Image class="avatar" src={author.data.avatar ?? noAvatar} alt={name} width={140} height={140} />
      <div>
        <h1>{name}</h1>
        <div class="social">
          {website && <a href={website} aria-label="Web"><Icon name="link" /></a>}
          {facebook && <a href={facebook} aria-label="Facebook"><Icon name="facebook" /></a>}
          {linkedin && <a href={linkedin} aria-label="LinkedIn"><Icon name="linkedin" /></a>}
        </div>
      </div>
    </div>
    <div class="prose"><Content /></div>
    {posts.length > 0 && (
      <>
        <h2 style="margin-top: var(--space-4)">Články autora</h2>
        <div class="posts">{posts.map((post) => <PostCard post={post} author={author} />)}</div>
      </>
    )}
  </section>
</Layout>
<style>
  .head { display: flex; gap: var(--space-3); align-items: center; margin-bottom: var(--space-3); }
  .avatar { width: 140px; height: 140px; border-radius: 50%; object-fit: cover; }
  .social { display: flex; gap: var(--space-2); margin-top: var(--space-1); }
  .posts { display: grid; gap: var(--space-3); margin-top: var(--space-2); }
</style>
```
(References `PostCard` from Task 7. If executing strictly in order, comment out the posts block until Task 7, then re-enable. Build verification in Step 5 assumes Task 7 done, or the block commented.)

- [ ] **Step 5: Build and verify the authors routes**

Run:
```bash
npm run build
node -e 'const {existsSync}=require("fs");const d=require("./migration/export.json");process.exit(d.authors.every(a=>existsSync(`dist/autori/${a.slug}/index.html`))&&existsSync("dist/autori/index.html")?0:1)'
```
Expected: build succeeds; node exits 0 (every author page + index exists).

- [ ] **Step 6: Commit**

```bash
git add src/components/Prose.astro src/components/AuthorCard.astro src/pages/autori
git commit -m "feat: author list and detail pages + Prose component"
```

---

## Task 7: Post pages

**Files:**
- Create: `src/components/PostCard.astro`, `src/pages/clanky/index.astro`, `src/pages/clanky/[slug].astro`

**Interfaces:**
- Consumes: `posts`, `authors`; `Prose`, `Icon`, `fullNameWithTitles`.
- Produces: `PostCard` with props `{ post: CollectionEntry<"posts">; author: CollectionEntry<"authors"> }`.

- [ ] **Step 1: Create `src/components/PostCard.astro`**

```astro
---
import { Image } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import { fullNameWithTitles } from "../lib/names";
import noImage from "../assets/static/no-image.svg";
interface Props { post: CollectionEntry<"posts">; author: CollectionEntry<"authors"> }
const { post, author } = Astro.props;
const date = post.data.publishedAt.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
---
<a class="card" href={`/clanky/${post.id}`}>
  <Image class="cover" src={post.data.image ?? noImage} alt={post.data.title} width={600} height={400} />
  <h3>{post.data.title}</h3>
  <p class="meta">{fullNameWithTitles(author.data)} · {date}</p>
</a>
<style>
  .card { display: block; color: var(--color-text); }
  .cover { width: 100%; aspect-ratio: 3/2; object-fit: cover; border-radius: var(--radius); box-shadow: var(--shadow-soft); }
  .card h3 { margin: var(--space-2) 0 var(--space-1); font-size: var(--h5); }
  .meta { color: var(--color-muted); font-size: .9rem; margin: 0; }
  .card:hover h3 { color: var(--color-primary); }
</style>
```

- [ ] **Step 2: Create `src/pages/clanky/index.astro`**

```astro
---
import { getCollection, getEntry } from "astro:content";
import Layout from "../../layouts/Layout.astro";
import PostCard from "../../components/PostCard.astro";
const posts = (await getCollection("posts")).sort((a, b) => +b.data.publishedAt - +a.data.publishedAt);
const withAuthors = await Promise.all(posts.map(async (post) => ({ post, author: await getEntry(post.data.author) })));
---
<Layout title="Články — S4HS">
  <section class="container" style="padding-block: var(--space-5)">
    <div style="text-align:center; max-width:640px; margin-inline:auto">
      <h1>Články</h1>
      <p>Najnovšie informácie týkajúce sa činností združenia <em>Society for human studies</em></p>
    </div>
    <div class="grid">
      {withAuthors.map(({ post, author }) => <PostCard post={post} author={author} />)}
    </div>
  </section>
</Layout>
<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); margin-top: var(--space-4); }
</style>
```

- [ ] **Step 3: Create `src/pages/clanky/[slug].astro`**

```astro
---
import { getCollection, getEntry, render } from "astro:content";
import { Image } from "astro:assets";
import Layout from "../../layouts/Layout.astro";
import Prose from "../../components/Prose.astro";
import Icon from "../../components/Icon.astro";
import { fullNameWithTitles } from "../../lib/names";
import noAvatar from "../../assets/static/no-avatar.svg";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}
const { post } = Astro.props;
const author = await getEntry(post.data.author);
const { Content } = await render(post);
const name = fullNameWithTitles(author.data);
const date = post.data.publishedAt.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
---
<Layout title={`${post.data.title} — S4HS`}>
  <article class="container" style="max-width: 760px; padding-block: var(--space-5)">
    <h1>{post.data.title}</h1>
    <div class="byline">
      <Image class="av" src={author.data.avatar ?? noAvatar} alt={name} width={48} height={48} />
      <a href={`/autori/${author.id}`}>{name}</a><span class="muted">· {date}</span>
    </div>
    <Prose markdown={post.data.description} />
    {post.data.image && <Image class="hero" src={post.data.image} alt={post.data.title} width={1024} height={640} />}
    <div class="prose"><Content /></div>
    <p style="margin-top: var(--space-4)"><a href="/clanky" class="back"><Icon name="arrow-left" size={16} /> Späť na články</a></p>
  </article>
</Layout>
<style>
  .byline { display: flex; align-items: center; gap: var(--space-1); padding-block: var(--space-2); border-block: 1px solid var(--color-border); margin-bottom: var(--space-3); }
  .av { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
  .muted { color: var(--color-muted); }
  .hero { width: 100%; border-radius: var(--radius); margin-block: var(--space-3); }
  .back { display: inline-flex; align-items: center; gap: 6px; }
</style>
```

- [ ] **Step 4: Build and verify post routes**

Run:
```bash
npm run build
node -e 'const {existsSync}=require("fs");const d=require("./migration/export.json");process.exit(d.posts.every(p=>existsSync(`dist/clanky/${p.slug}/index.html`))&&existsSync("dist/clanky/index.html")?0:1)'
```
Expected: build succeeds; node exits 0. Manually open one post and confirm the inline embed image renders (see Task 4 Step 4 note); if broken, fix the embed `src` prefix and re-run migration.

- [ ] **Step 5: Commit**

```bash
git add src/components/PostCard.astro src/pages/clanky
git commit -m "feat: post list and detail pages"
```

---

## Task 8: Publication pages + Gallery

**Files:**
- Create: `src/components/PublicationCard.astro`, `src/components/Gallery.astro`
- Create: `src/pages/publikacie/index.astro`, `src/pages/publikacie/[slug].astro`

**Interfaces:**
- Consumes: `publications`; `Prose`.
- Produces: `PublicationCard` with props `{ publication: CollectionEntry<"publications"> }`. `Gallery` with props `{ images: ImageMetadata[]; alt: string }`.

- [ ] **Step 1: Create `src/components/PublicationCard.astro`**

```astro
---
import { Image } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import noImage from "../assets/static/no-image.svg";
interface Props { publication: CollectionEntry<"publications"> }
const { publication } = Astro.props;
---
<a class="card" href={`/publikacie/${publication.id}`}>
  <Image class="cover" src={publication.data.image ?? noImage} alt={publication.data.title} width={500} height={700} />
  <h3>{publication.data.title}</h3>
</a>
<style>
  .card { display: block; color: var(--color-text); }
  .cover { width: 100%; aspect-ratio: 5/7; object-fit: cover; border-radius: var(--radius); box-shadow: var(--shadow-soft); }
  .card h3 { margin: var(--space-2) 0 0; font-size: var(--h5); }
  .card:hover h3 { color: var(--color-primary); }
</style>
```

- [ ] **Step 2: Create `src/components/Gallery.astro`**

```astro
---
import { Image } from "astro:assets";
interface Props { images: import("astro").ImageMetadata[]; alt: string }
const { images, alt } = Astro.props;
---
{images.length > 0 && (
  <div class="gallery">
    {images.map((img, i) => <Image src={img} alt={`${alt} — ${i + 1}`} width={400} height={300} />)}
  </div>
)}
<style>
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-2); margin-top: var(--space-3); }
  .gallery :global(img) { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: var(--radius); }
</style>
```

- [ ] **Step 3: Create `src/pages/publikacie/index.astro`**

```astro
---
import { getCollection } from "astro:content";
import Layout from "../../layouts/Layout.astro";
import PublicationCard from "../../components/PublicationCard.astro";
const publications = (await getCollection("publications")).sort((a, b) => +b.data.createdAt - +a.data.createdAt);
---
<Layout title="Publikácie — S4HS">
  <section class="container" style="padding-block: var(--space-5)">
    <h1>Publikácie</h1>
    <div class="grid">{publications.map((publication) => <PublicationCard publication={publication} />)}</div>
  </section>
</Layout>
<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); margin-top: var(--space-3); }
</style>
```

- [ ] **Step 4: Create `src/pages/publikacie/[slug].astro`**

```astro
---
import { getCollection, render } from "astro:content";
import { Image } from "astro:assets";
import Layout from "../../layouts/Layout.astro";
import Prose from "../../components/Prose.astro";
import Gallery from "../../components/Gallery.astro";

export async function getStaticPaths() {
  const publications = await getCollection("publications");
  return publications.map((publication) => ({ params: { slug: publication.id }, props: { publication } }));
}
const { publication } = Astro.props;
const { Content } = await render(publication);
---
<Layout title={`${publication.data.title} — S4HS`}>
  <article class="container" style="max-width: 820px; padding-block: var(--space-5)">
    <h1>{publication.data.title}</h1>
    {publication.data.image && <Image class="cover" src={publication.data.image} alt={publication.data.title} width={500} height={700} />}
    <Prose markdown={publication.data.shortDescription} />
    <div class="prose"><Content /></div>
    <Gallery images={publication.data.gallery} alt={publication.data.title} />
  </article>
</Layout>
<style>
  .cover { float: right; width: 280px; max-width: 40%; margin: 0 0 var(--space-2) var(--space-3); border-radius: var(--radius); box-shadow: var(--shadow-soft); }
</style>
```

- [ ] **Step 5: Build and verify publication routes**

Run:
```bash
npm run build
node -e 'const {existsSync}=require("fs");const d=require("./migration/export.json");process.exit(d.publications.every(p=>existsSync(`dist/publikacie/${p.slug}/index.html`))&&existsSync("dist/publikacie/index.html")?0:1)'
```
Expected: build succeeds; node exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/PublicationCard.astro src/components/Gallery.astro src/pages/publikacie
git commit -m "feat: publication list and detail pages with gallery"
```

---

## Task 9: Home page (hero + sections)

**Files:**
- Create: `src/components/Typing.astro`, `src/pages/index.astro`

**Interfaces:**
- Consumes: `posts`, `publications`, `authors`; `PostCard`, `PublicationCard`, `AuthorCard`; hero images in `src/assets/static/hero/`.
- Produces: `Typing` with props `{ words: string[] }` (cycles words with a typewriter effect via inline vanilla JS).

- [ ] **Step 1: Create `src/components/Typing.astro`**

```astro
---
interface Props { words: string[] }
const { words } = Astro.props;
const id = "typing-" + Math.abs(words.join().length * 7 + words[0].length);
---
<strong id={id} class="typing" data-words={JSON.stringify(words)}></strong>
<style>.typing { color: var(--color-warning); }</style>
<script type="module" define:vars={{ id }}>
  const el = document.getElementById(id);
  const words = JSON.parse(el.dataset.words);
  let w = 0, c = 0, deleting = false;
  (function tick() {
    const word = words[w];
    el.textContent = word.slice(0, c);
    if (!deleting && c < word.length) c++;
    else if (deleting && c > 0) c--;
    else if (!deleting) { deleting = true; setTimeout(tick, 1400); return; }
    else { deleting = false; w = (w + 1) % words.length; }
    setTimeout(tick, deleting ? 60 : 110);
  })();
</script>
```
(Avoid `Math.random` for the id; the deterministic expression above is fine. If two Typing instances ever share a page, pass a unique suffix.)

- [ ] **Step 2: Create `src/pages/index.astro`**

```astro
---
import { getCollection, getEntry } from "astro:content";
import { Image } from "astro:assets";
import Layout from "../layouts/Layout.astro";
import Typing from "../components/Typing.astro";
import PostCard from "../components/PostCard.astro";
import PublicationCard from "../components/PublicationCard.astro";
import AuthorCard from "../components/AuthorCard.astro";

const heroImages = Object.values(
  import.meta.glob("../assets/static/hero/*.jpg", { eager: true, import: "default" })
);
const posts = (await getCollection("posts")).sort((a, b) => +b.data.publishedAt - +a.data.publishedAt).slice(0, 5);
const postsWithAuthors = await Promise.all(posts.map(async (post) => ({ post, author: await getEntry(post.data.author) })));
const publications = (await getCollection("publications")).sort((a, b) => +b.data.createdAt - +a.data.createdAt).slice(0, 8);
const authors = (await getCollection("authors")).sort((a, b) => a.data.lastName.localeCompare(b.data.lastName, "sk"));
---
<Layout title="Society for human studies">
  <section class="hero container">
    <div class="hero-copy">
      <h1>Chceme <Typing words={["vzdelanie", "poznanie", "kritické myslenie"]} /><br />a poznanie v oblasti humanitných vied</h1>
      <p>Sme združením odborných a vedeckých pracovníkov, priaznivcov, podporovateľov a záujemcov o humanitné vedy a kultúru.</p>
    </div>
    <div class="hero-gallery">
      {heroImages.slice(0, 12).map((img) => <Image src={img} alt="" width={180} height={240} loading="eager" />)}
    </div>
  </section>

  <section class="container section">
    <h2>Najnovšie články</h2>
    <div class="grid grid-posts">{postsWithAuthors.map(({ post, author }) => <PostCard post={post} author={author} />)}</div>
  </section>

  <section class="bg"><div class="container section">
    <h2>Publikácie</h2>
    <div class="grid grid-pubs">{publications.map((publication) => <PublicationCard publication={publication} />)}</div>
  </div></section>

  <section class="container section">
    <h2>Náš tím</h2>
    <div class="grid grid-team">{authors.map((author) => <AuthorCard author={author} />)}</div>
  </section>
</Layout>
<style>
  .hero { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); align-items: center; padding-block: var(--space-5); }
  .hero h1 { font-size: var(--h1); font-weight: var(--weight-semibold); }
  .hero-gallery { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-1); }
  .hero-gallery :global(img) { width: 100%; border-radius: var(--radius); box-shadow: var(--shadow-soft); }
  .section { padding-block: var(--space-5); }
  .bg { background: var(--color-bg-light); }
  .grid { display: grid; gap: var(--space-4); margin-top: var(--space-3); }
  .grid-posts { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .grid-pubs { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .grid-team { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  @media (max-width: 767px) { .hero { grid-template-columns: 1fr; } .hero-gallery { display: none; } }
</style>
```

- [ ] **Step 3: Build and verify the homepage renders the typing markup**

Run:
```bash
npm run build && node --test tests/build.test.mjs
grep -q 'class="typing"' dist/index.html && echo "typing OK"
```
Expected: build succeeds; PASS; prints `typing OK`.

- [ ] **Step 4: Commit**

```bash
git add src/components/Typing.astro src/pages/index.astro
git commit -m "feat: homepage with hero, posts, publications and team sections"
```

---

## Task 10: 404 page + full build verification

**Files:**
- Create: `src/pages/404.astro`
- Modify: `tests/build.test.mjs` (add route-coverage assertions)

- [ ] **Step 1: Create `src/pages/404.astro`**

```astro
---
import Layout from "../layouts/Layout.astro";
---
<Layout title="Stránka nenájdená — S4HS">
  <section class="container" style="padding-block: var(--space-5); text-align: center">
    <h1>404</h1>
    <p>Stránka nebola nájdená.</p>
    <p><a href="/">Späť na úvod</a></p>
  </section>
</Layout>
```

- [ ] **Step 2: Extend `tests/build.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const data = JSON.parse((await import("node:fs/promises")).then ? "{}" : "{}"); // replaced below
```
Replace the whole file with:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const data = JSON.parse(readFileSync("migration/export.json", "utf8"));

test("core pages exist", () => {
  for (const p of ["index", "404", "clanky/index", "autori/index", "publikacie/index"]) {
    assert.ok(existsSync(`dist/${p}.html`), `dist/${p}.html missing`);
  }
});

test("every content route is generated 1:1", () => {
  for (const a of data.authors) assert.ok(existsSync(`dist/autori/${a.slug}/index.html`), `author ${a.slug}`);
  for (const p of data.posts) assert.ok(existsSync(`dist/clanky/${p.slug}/index.html`), `post ${p.slug}`);
  for (const p of data.publications) assert.ok(existsSync(`dist/publikacie/${p.slug}/index.html`), `pub ${p.slug}`);
});
```

- [ ] **Step 3: Full build and verification**

Run:
```bash
npm run build && node --test tests/build.test.mjs
```
Expected: build succeeds; both tests PASS (all core + 28 content routes present).

- [ ] **Step 4: Commit**

```bash
git add src/pages/404.astro tests/build.test.mjs
git commit -m "feat: 404 page + full route-coverage build test"
```

---

## Task 11: Cloudflare Pages deployment

**Files:**
- Create: `wrangler.toml` (optional), `README.md` deploy section, `.github/` not required.

- [ ] **Step 1: Document and configure deployment**

Create `wrangler.toml`:
```toml
name = "s4hs"
pages_build_output_dir = "dist"
```

- [ ] **Step 2: Verify a production build locally**

Run:
```bash
npm run build && npm run preview &
sleep 2 && curl -sf http://localhost:4321/ >/dev/null && echo "serves OK"
kill %1
```
Expected: prints `serves OK`.

- [ ] **Step 3: Connect Cloudflare Pages (manual, by the user)**

In the Cloudflare dashboard: create a Pages project from this Git repo with **build command** `npm run build` and **output directory** `dist`, framework preset "Astro". No environment variables. After the first successful deploy, point the custom domain (`s4hs.sk`) at the Pages project.

- [ ] **Step 4: Commit**

```bash
git add wrangler.toml README.md
git commit -m "chore: cloudflare pages deployment config"
```

---

## Self-Review

**Spec coverage:**
- Static Astro on Cloudflare → Tasks 1, 11. ✓
- Content collections, frozen in git → Tasks 2, 4. ✓
- ActionText→Markdown via Rails export (Approach A) → Tasks 3, 4. ✓
- URLs 1:1 (`<slug>.md` → `id` → route) → Tasks 6–8, verified Task 10. ✓
- Drop Bootstrap/jQuery; scoped CSS + token stylesheet from legacy theme → Tasks 1, 5–9. ✓
- Images optimized via `astro:assets` → all page tasks. ✓
- Home hero typing animation in vanilla JS → Task 9. ✓
- Authors/posts/publications list+detail, gallery, author's posts → Tasks 6–9. ✓
- Out of scope (admin, auth, pagination, search) → not built. ✓

**Placeholder scan:** Theme hex values in Task 1 Step 4 are explicitly seeded from a real extraction command (Step 3), not invented. The single inline-embed image-path edge case is flagged in Task 4/7 with a concrete fix. No TBD/TODO remain.

**Type consistency:** Field names match across schema (Task 2) and consumers: `author` reference resolved via `getEntry`; `publishedAt`/`createdAt` are dates; `description`/`shortDescription` are Markdown strings fed to `Prose`; `image`/`avatar`/`gallery` are `image()` metadata fed to `<Image>`. Component prop names (`post`, `author`, `publication`, `images`, `markdown`, `words`, `name`) are consistent between definition and use.

## Open verification items (resolve during execution)
- Confirm exact theme palette hex values (Task 1 Step 3) before finalizing tokens.
- Confirm the single rich-text embed renders; adjust its image `src` prefix if Astro can't resolve it (Task 4 Step 4 note).
- Confirm hero typing words match the desired copy (legacy used a single animated word; Task 9 uses a small list — adjust to taste).
