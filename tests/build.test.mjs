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
