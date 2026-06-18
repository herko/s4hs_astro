// tests/build.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test("build produced a homepage", () => {
  assert.ok(existsSync("dist/index.html"), "dist/index.html should exist after `astro build`");
});
