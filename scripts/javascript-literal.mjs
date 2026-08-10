export function javascriptStringLiteral(value) {
  if (typeof value !== "string") throw new TypeError("javascript_string_literal_requires_string");
  return JSON.stringify(value)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/\//g, "\\/")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
