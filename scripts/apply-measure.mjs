import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { headSnippet, gscToken, GSC_VERIFICATION } from "../public/assets/measure.js";

const start = "<!-- measure:start -->";
const end = "<!-- measure:end -->";
const block = `${start}\n${headSnippet()}\n${end}`;
const marker = new RegExp(`${start}[\\s\\S]*?${end}`);

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

if (String(GSC_VERIFICATION || "").trim() && !gscToken()) {
  console.warn("GSC_VERIFICATION is set but is not a token, so no meta tag was written.");
}

for (const file of htmlFiles("public")) {
  let html = readFileSync(file, "utf8");
  if (marker.test(html)) html = html.replace(marker, block);
  else if (!html.includes("</head>")) throw new Error(`${file} has no </head>`);
  else html = html.replace("</head>", `${block}\n</head>`);

  if (!html.includes("assets/measure.js")) {
    const site = /<script src="([^"]*?)assets\/site\.js" defer><\/script>/;
    if (!site.test(html)) throw new Error(`${file} has no site.js script`);
    html = html.replace(site, (tag, prefix) => `${tag}\n<script type="module" src="${prefix}assets/measure.js"></script>`);
  }
  writeFileSync(file, html);
}
