import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../src/markdown.js";
import { normalizeSessionId } from "../src/session-transcript.js";

test("normalizeSessionId strips local/cloud prefixes", () => {
  assert.equal(normalizeSessionId("local:019fd63c-15b5-7bc1-8110-22dbe0117e75"), "019fd63c-15b5-7bc1-8110-22dbe0117e75");
  assert.equal(normalizeSessionId("cloud:019fd63c-15b5-7bc1-8110-22dbe0117e75"), "019fd63c-15b5-7bc1-8110-22dbe0117e75");
  assert.equal(normalizeSessionId("not-a-uuid"), "");
});

test("renderMarkdown escapes HTML and renders common blocks", () => {
  const html = renderMarkdown([
    "# Title",
    "",
    "Hello **bold** and `code`.",
    "",
    "- one",
    "- two",
    "",
    "| Field | Meaning |",
    "| --- | --- |",
    "| name | Display name |",
    "",
    "```js",
    "const x = 1 < 2",
    "```",
    "",
    "[link](https://example.com)",
    "",
    "<script>alert(1)</script>",
    "<SCRIPT src=https://example.invalid/payload.js></SCRIPT>",
  ].join("\n"));

  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
  assert.match(html, /<div class="better-codex-table-wrap"><table>/);
  assert.match(html, /<th>Field<\/th>/);
  assert.match(html, /<td>Display name<\/td>/);
  assert.match(html, /<pre><code class="language-js">const x = 1 &lt; 2\s*<\/code><\/pre>/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;SCRIPT src=https:\/\/example\.invalid\/payload\.js&gt;&lt;\/SCRIPT&gt;/);
  assert.doesNotMatch(html, /<script\b/i);
});
