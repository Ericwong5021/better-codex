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
    "```js",
    "const x = 1 < 2",
    "```",
    "",
    "[link](https://example.com)",
    "",
    "<script>alert(1)</script>",
  ].join("\n"));

  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<pre><code class="language-js">const x = 1 &lt; 2<\/code><\/pre>/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
