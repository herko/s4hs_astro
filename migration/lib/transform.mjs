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
    return "\n" + v.map((item) => `  - ${quote(item)}`).join("\n");
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
    const val = yamlValue(v, "");
    if (val.startsWith("\n")) {
      lines.push(`${k}:${val}`);
    } else {
      lines.push(`${k}: ${val}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}
