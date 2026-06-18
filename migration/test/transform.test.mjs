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
