# S4HS: Rails → Astro migration — design

**Date:** 2026-06-18
**Status:** Approved (design)

## Goal

Replace the legacy Rails 6 + PostgreSQL + S3 application (`s4hs_sk`, "Society for Human Studies")
with a fully static **Astro** site deployed on **Cloudflare Pages**. The new site keeps the same
content and visual appearance, but drops all runtime dependencies (Rails, Postgres, S3, Devise admin).

## Decisions (from brainstorming)

- **Visual fidelity:** faithful replica + minor improvements. Same structure/content/look, but modern
  CSS instead of Bootstrap 4 / jQuery / Turbolinks.
- **Content workflow:** frozen content in git. Content becomes Astro content collections (Markdown +
  frontmatter); images committed to the repo. Editing is done by developers via git. No CMS.
- **Rich text:** ActionText HTML → Markdown (clean, git-editable).
- **URLs:** preserve 1:1 (`/clanky/:slug`, `/autori/:slug`, `/publikacie/:slug`, `/`). Slugs come
  from the existing `friendly_id` slugs in the DB.
- **Content extraction:** Approach A — render content via the legacy Rails app on the server (read-only
  one-time export), because only Rails can faithfully resolve ActionText `<action-text-attachment>` tags.
- **Styling:** scoped CSS per component + a small global stylesheet of theme tokens (colors,
  typography, spacing) derived from the existing `app/assets/stylesheets/theme` as a *visual reference*.
  Rewritten as clean custom CSS — the original Bootstrap template is NOT imported.

## Source data model (legacy)

From `db/schema.rb` and models:

- **users** → authors: `first_name`, `middle_name`, `last_name`, `title_before`, `title_after`,
  `url`, `website`, `facebook`, `linkedin`, `slug`; rich text `bio`; attached `avatar`; `has_many :posts`.
- **posts**: `title`, `author_id`, `status` (integer enum, default 0), `created_at`, `slug`;
  rich text `description` (lead) and `content` (body); attached `image` (cover).
- **publications**: `title`, `created_at`, `slug`; rich text `short_description` and `long_description`;
  attached `image` (cover) and `gallery_images` (many).
- ActiveStorage: `active_storage_blobs` (`key`, `filename`, `content_type`, ...) +
  `active_storage_attachments` link records. Files live in S3 bucket `s4hs-production`, already
  downloaded to `legacy-s4hs/storage/s3/<key>`.

Counts: 3 users, 4 posts, 21 publications, 167 referenced blobs.

Public routes mirrored from `config/routes.rb`:
`root → home`, `/clanky` (posts), `/autori` (users), `/publikacie` (publications), each with `:slug` show.

## Architecture

Pure static Astro (`output: 'static'`), no SSR adapter. Build `astro build` → `dist/`, served by
Cloudflare Pages.

```
src/
  content/
    config.ts                 # collection schemas
    authors/<slug>.md
    posts/<slug>.md
    publications/<slug>.md
  assets/images/...           # optimized via astro:assets <Image>
  components/                 # Navbar, Footer, Hero, PostCard, PublicationCard, AuthorCard, Gallery, Prose
  layouts/Layout.astro
  pages/
    index.astro
    clanky/index.astro, clanky/[slug].astro
    autori/index.astro, autori/[slug].astro
    publikacie/index.astro, publikacie/[slug].astro
    404.astro
migration/                    # one-time pipeline, not part of the prod build
  export.rb                   # runs on server via `bin/rails runner`
  migrate.mjs                 # export.json → Markdown + images
legacy-s4hs/                  # downloaded legacy app (gitignored — contains secrets)
```

## Migration pipeline (one-time, Approach A)

### Step 1 — `migration/export.rb` (on server)

Run with `bin/rails runner export.rb` inside `~/apps/s4hs_sk/production` on the server. It iterates
Users, Posts, Publications and emits a single `export.json` to stdout / a tmp file. For each record:

- scalar fields (title, names, titles, social links, status, created_at, slug),
- each rich text field rendered to final HTML (`record.field.to_s` / `.body.to_html` so ActionText
  resolves `<action-text-attachment>` into real `<img>` / figures),
- for each attached blob: `{ key, filename, content_type, byte_size }` so the Node step can map and copy.

The slug is taken from the model (`friendly_id`); authors are referenced by slug from posts.
Only read access; nothing on the server is modified. `export.json` is downloaded into `migration/`.

### Step 2 — `migration/migrate.mjs` (local, Node)

- Parse `export.json`.
- Convert each rich-text HTML field → Markdown with `turndown` (configured for the few constructs
  Trix/ActionText produces: headings, bold/italic, links, lists, blockquotes, figures/images).
- Rewrite image `src` in the rendered HTML (which point at blob keys / S3 URLs) to relative repo paths,
  then resolve `key → filename` and copy `legacy-s4hs/storage/s3/<key>` → `src/assets/images/<dir>/<filename>`.
  Dedupe by key; sanitize filenames; keep a key→path map for the run.
- Write content files: body = main rich field (post `content`, publication `long_description`, author
  `bio`); secondary rich field (post `description`, publication `short_description`) stored as a Markdown
  string in frontmatter and rendered via the `Prose` component.
- Idempotent: safe to re-run (overwrites generated files, re-copies images).

## Content collections schema (`src/content/config.ts`)

- **authors**: `firstName`, `lastName`, `middleName?`, `titleBefore?`, `titleAfter?`, `website?`,
  `facebook?`, `linkedin?`, `avatar` (image), `slug`. Body = bio (Markdown).
- **posts**: `title`, `slug`, `author` (reference → authors by slug), `status`, `publishedAt` (date),
  `description` (Markdown string, lead), `image` (cover image). Body = content (Markdown).
  Only `status == "published"` rendered (mirror the Rails controller scope).
- **publications**: `title`, `slug`, `shortDescription` (Markdown string), `image` (cover),
  `gallery` (array of images). Body = longDescription (Markdown).

Images use the `image()` helper in the collection schema so `astro:assets` optimizes them.

## Pages & components

- **`/` home**: Hero (with a typing effect re-implemented in small vanilla JS, replacing typed.js),
  About section, latest posts preview, publications preview, team (authors).
- **`/clanky`**: list of published posts (PostCard grid). **`/clanky/[slug]`**: post — title, author
  byline + avatar + date, lead, cover image, body, author footer, back link.
- **`/autori`**: author grid. **`/autori/[slug]`**: author profile (avatar, titles, bio, social links)
  + that author's posts.
- **`/publikacie`**: publication grid. **`/publikacie/[slug]`**: publication — title, cover, long
  description, image gallery.
- **`404.astro`**.
- Shared: `Layout` (`<head>`, meta, fonts), `Navbar`, `Footer`, `Prose` (renders Markdown strings),
  card components, `Gallery`.

## Styling

Drop Bootstrap 4, jQuery, popper, Turbolinks, Stimulus. Each component owns scoped CSS. A small global
stylesheet defines theme tokens (CSS custom properties: colors, font families/sizes, spacing scale)
extracted from the existing `theme` SCSS so the look is preserved. Fonts re-declared from the original.
The hero typing animation is the only JS; everything else is static HTML/CSS.

## Deployment (Cloudflare Pages)

Static output. Cloudflare Pages project with build command `astro build` and output directory `dist`.
No environment variables or server runtime required. Custom domain pointed at Pages once verified.

## Out of scope (YAGNI)

- Admin UI / CMS, Devise authentication, user accounts, password reset, mailers.
- Pagination (4 posts / 21 publications fit comfortably; add a simple version only if needed).
- Gallery CRUD, draft previews, search.
- Importing the original Bootstrap template CSS verbatim.

## Risks / open items

- **ActionText rendering on server**: requires booting Rails (`bin/rails runner`) on the server; verified
  Rails boots there (`credentials:show` worked). The export must not touch the DB writably.
- **Trix → Markdown fidelity**: unusual inline formatting may need manual touch-up post-conversion;
  acceptable per "minor improvements".
- **`posts.status` enum mapping**: confirm the integer→symbol mapping (0 = draft? published?) from the
  Post model / controller before filtering. Only published posts are published to the static site.
- **Inline images inside rich text** (vs. dedicated `image`/`gallery_images` attachments): both handled
  by the blob key→file copy step.
