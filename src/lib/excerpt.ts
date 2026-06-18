// Strip Markdown to plain text (mirrors Rails `RichText#to_plain_text`).
export function plainText(md: string): string {
  return (md ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → text
    .replace(/[#*_>`~]/g, "") // markdown syntax
    .replace(/\s+/g, " ")
    .trim();
}

// Plain-text excerpt of a Markdown string, truncated at a word boundary.
// Mirrors the legacy Rails `truncate(bio.to_plain_text, length: N)`.
export function excerpt(md: string, len = 300): string {
  const text = plainText(md);
  return text.length <= len ? text : text.slice(0, len).replace(/\s+\S*$/, "") + " …";
}
