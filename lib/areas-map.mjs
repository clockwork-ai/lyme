import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const areasHtmlPath = resolve(root, "public/areas/index.html");
const widePath = resolve(root, "public/assets/maps/areas-wide.svg");
const tallPath = resolve(root, "public/assets/maps/areas-tall.svg");

/* Settlement centres (village, town or suburb), not a street or a building.
   Keyed by the area page slug so a new list entry fails until it is placed. */
const centres = {
  "high-lane": [53.3651108, -2.0696568],
  stockport: [53.407901, -2.160243],
  "hazel-grove": [53.3768486, -2.117817],
  marple: [53.3930149, -2.0693132],
  bramhall: [53.3686407, -2.1593962],
  cheadle: [53.3936441, -2.2122068],
  "cheadle-hulme": [53.370983, -2.1928018],
  "heald-green": [53.3700754, -2.2307279],
  offerton: [53.3958378, -2.1250707],
  disley: [53.35826, -2.0359287],
  "new-mills": [53.365432, -2.0012794],
  "whaley-bridge": [53.3300532, -1.9834471],
  poynton: [53.3492505, -2.1174396],
  wilmslow: [53.3261292, -2.2327511],
  "alderley-edge": [53.3058355, -2.2375778],
  prestbury: [53.2893543, -2.1516493],
  hale: [53.3783266, -2.3429627],
  "hale-barns": [53.3691323, -2.3143148],
};

const prefer = {
  wide: {
    stockport: "n",
    offerton: "ne",
    marple: "e",
    "hazel-grove": "nw",
    bramhall: "w",
    cheadle: "n",
    "cheadle-hulme": "s",
    "heald-green": "w",
    "high-lane": "s",
    disley: "e",
    "new-mills": "ne",
    "whaley-bridge": "se",
    poynton: "sw",
    wilmslow: "nw",
    "alderley-edge": "s",
    prestbury: "s",
    hale: "nw",
    "hale-barns": "s",
  },
  tall: {
    stockport: "n",
    offerton: "n",
    marple: "ne",
    "hazel-grove": "nw",
    bramhall: "w",
    cheadle: "nw",
    "cheadle-hulme": "sw",
    "heald-green": "w",
    "high-lane": "se",
    disley: "e",
    "new-mills": "ne",
    "whaley-bridge": "se",
    poynton: "s",
    wilmslow: "nw",
    "alderley-edge": "s",
    prestbury: "s",
    hale: "n",
    "hale-barns": "s",
  },
};

const paper = "#f4f8f9";
const ink = "#122029";
const copper = "#e08c55";
const copperDeep = "#9a4a1c";

export function areasFromHtml(html) {
  const start = html.indexOf('class="area-groups"');
  const end = html.indexOf('class="ph ph--map');
  if (start < 0 || end < start) throw new Error("Could not find the areas list");
  const block = html.slice(start, end);
  const areas = [];
  const re = /<a href="(?:\.\.\/)?areas\/([a-z0-9-]+)\/"><b>([^<]+)<\/b>/g;
  let match;
  while ((match = re.exec(block))) areas.push({ slug: match[1], name: match[2] });
  if (!areas.length) throw new Error("The areas list was empty");
  return areas;
}

export function altText(areas) {
  const names = areas.map((area) => area.name);
  const list = names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `Map of the areas I cover, centred on High Lane: ${list}.`;
}

function textWidth(text, fontSize) {
  let em = 0;
  for (const ch of text) {
    if (ch === " ") em += 0.33;
    else if ("ilj".includes(ch)) em += 0.28;
    else if ("mwMW".includes(ch)) em += 0.86;
    else if (ch.toUpperCase() === ch && ch.toLowerCase() !== ch) em += 0.7;
    else em += 0.56;
  }
  return em * fontSize;
}

function project(areas) {
  const home = centres["high-lane"];
  if (!home) throw new Error("High Lane is missing from the centre table");
  const [lat0, lon0] = home;
  const cos = Math.cos((lat0 * Math.PI) / 180);
  return areas.map((area) => {
    const centre = centres[area.slug];
    if (!centre) throw new Error(`No map centre for ${area.slug}. Add the settlement centre, not a street address.`);
    const [lat, lon] = centre;
    return {
      ...area,
      xKm: (lon - lon0) * 111.32 * cos,
      yKm: (lat - lat0) * 110.574,
    };
  });
}

function frame(points, width, height, fontSize) {
  let halfX = Math.max(...points.map((p) => Math.abs(p.xKm)), 1);
  let halfY = Math.max(...points.map((p) => Math.abs(p.yKm)), 1);
  const aspect = width / height;
  halfX += 2.2;
  halfY += 2.4;
  if (halfX / halfY < aspect) halfX = halfY * aspect;
  else halfY = halfX / aspect;
  const labelKm = (Math.max(...points.map((p) => textWidth(p.name, fontSize))) / 2 + fontSize) / (width / 2 / halfX);
  halfX += labelKm * 0.15;
  halfY += labelKm * 0.05;
  if (halfX / halfY < aspect) halfX = halfY * aspect;
  else halfY = halfX / aspect;
  return { halfX, halfY, scale: width / 2 / halfX };
}

function toPx(point, layout, width, height) {
  return {
    x: width / 2 + point.xKm * layout.scale,
    y: height / 2 - point.yKm * layout.scale,
  };
}

const directions = {
  n: { ax: 0, ay: -1, anchor: "middle", base: "auto" },
  s: { ax: 0, ay: 1, anchor: "middle", base: "hanging" },
  e: { ax: 1, ay: 0, anchor: "start", base: "middle" },
  w: { ax: -1, ay: 0, anchor: "end", base: "middle" },
  ne: { ax: 0.85, ay: -0.85, anchor: "start", base: "auto" },
  nw: { ax: -0.85, ay: -0.85, anchor: "end", base: "auto" },
  se: { ax: 0.85, ay: 0.85, anchor: "start", base: "hanging" },
  sw: { ax: -0.85, ay: 0.85, anchor: "end", base: "hanging" },
};

function labelBox(pin, dir, fontSize, gap, name) {
  const w = textWidth(name, fontSize);
  const h = fontSize * 1.05;
  const dx = dir.ax * (gap + (Math.abs(dir.ax) > 0.5 ? 0 : 0));
  const dy = dir.ay * gap;
  let x = pin.x + dx;
  let y = pin.y + dy;
  if (dir.anchor === "middle") x -= w / 2;
  else if (dir.anchor === "end") x -= w;
  if (dir.base === "auto") y -= h;
  else if (dir.base === "middle") y -= h / 2;
  return { x, y, w, h, textX: pin.x + dx, textY: pin.y + dy };
}

function overlap(a, b, pad) {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (x <= -pad || y <= -pad) return 0;
  return (x + pad) * (y + pad);
}

function inside(box, width, height, margin) {
  return box.x >= margin && box.y >= margin && box.x + box.w <= width - margin && box.y + box.h <= height - margin;
}

function placeLabels(pins, spec, mode) {
  const chosen = prefer[mode];
  const reach = spec.pin + spec.fontSize * (mode === "tall" ? 1.15 : 0.55);
  const order = [...pins].sort((a, b) => {
    const da = Math.min(...pins.filter((p) => p !== a).map((p) => Math.hypot(p.x - a.x, p.y - a.y)));
    const db = Math.min(...pins.filter((p) => p !== b).map((p) => Math.hypot(p.x - b.x, p.y - b.y)));
    return da - db;
  });
  const placed = [];
  for (const pin of order) {
    const names = Object.keys(directions);
    names.sort((a, b) => (a === chosen[pin.slug] ? -1 : 0) - (b === chosen[pin.slug] ? -1 : 0));
    let best = null;
    for (const name of names) {
      const dir = directions[name];
      const box = labelBox(pin, dir, spec.fontSize, reach, pin.name);
      let score = name === chosen[pin.slug] ? 0 : 12;
      if (!inside(box, spec.width, spec.height, spec.fontSize * 0.2)) score += 900;
      for (const other of placed) score += overlap(box, other.box, spec.fontSize * 0.35);
      for (const other of pins) {
        const dot = { x: other.x - spec.pin * 1.6, y: other.y - spec.pin * 1.6, w: spec.pin * 3.2, h: spec.pin * 3.2 };
        score += overlap(box, dot, 1) * 3;
      }
      if (!best || score < best.score) best = { score, box, dir, name };
    }
    placed.push({ pin, box: best.box, dir: best.dir, side: best.name });
  }
  if (mode === "tall") relaxLabels(placed, spec);
  clampBoxes(placed, spec);
  return placed;
}

function relaxLabels(placed, spec) {
  const margin = 10;
  for (let pass = 0; pass < 48; pass++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i].box;
        const b = placed[j].box;
        if (overlap(a, b, spec.fontSize * 0.28) <= 0) continue;
        const push = 6;
        const upFirst = a.y <= b.y;
        const upper = upFirst ? a : b;
        const lower = upFirst ? b : a;
        const upperRoom = upper.y - margin;
        const lowerRoom = spec.height - margin - (lower.y + lower.h);
        if (upperRoom > 2) shiftBox(upper, -Math.min(push, upperRoom));
        if (lowerRoom > 2) shiftBox(lower, Math.min(push, lowerRoom));
        if (upperRoom <= 2 && lowerRoom <= 2) {
          const left = upper.x <= lower.x ? upper : lower;
          const right = left === upper ? lower : upper;
          if (left.x - margin > 2) shiftBox(left, 0, -Math.min(push, left.x - margin));
          else shiftBox(right, 0, Math.min(push, spec.width - margin - (right.x + right.w)));
        }
        moved = true;
      }
    }
    clampBoxes(placed, spec);
    if (!moved) break;
  }
}

function clampBoxes(placed, spec) {
  const margin = 12;
  for (const { box } of placed) {
    if (box.x < margin) shiftBox(box, 0, margin - box.x);
    if (box.y < margin) shiftBox(box, margin - box.y);
    const overX = box.x + box.w - (spec.width - margin);
    if (overX > 0) shiftBox(box, 0, -overX);
    const overY = box.y + box.h - (spec.height - margin);
    if (overY > 0) shiftBox(box, -overY);
  }
}

function shiftBox(box, dy, dx = 0) {
  box.y += dy;
  box.x += dx;
  box.textY += dy;
  box.textX += dx;
}

function svgFor(areas, spec, mode) {
  const points = project(areas);
  const layout = frame(points, spec.width, spec.height, spec.fontSize);
  const pins = points.map((point) => ({ ...point, ...toPx(point, layout, spec.width, spec.height) }));
  const labels = placeLabels(pins, spec, mode);
  const blur = (2.1 * layout.scale).toFixed(1);
  const rings = [5, 10, 15, 20].filter((km) => km * layout.scale < Math.min(spec.width, spec.height) * 0.48);
  const home = pins.find((pin) => pin.slug === "high-lane");
  const font = readFileSync(resolve(root, "public/assets/fonts/geist-latin.woff2")).toString("base64");
  const wash = pins.map((pin) => `<circle cx="${pin.x.toFixed(1)}" cy="${pin.y.toFixed(1)}" r="${(6.4 * layout.scale).toFixed(1)}"/>`).join("");
  const ring = rings.map((km) => `<circle cx="${home.x.toFixed(1)}" cy="${home.y.toFixed(1)}" r="${(km * layout.scale).toFixed(1)}"/>`).join("");
  const leaders = mode === "tall" ? labels.map(({ pin, box }) => {
    const nearX = Math.max(box.x, Math.min(pin.x, box.x + box.w));
    const nearY = Math.max(box.y, Math.min(pin.y, box.y + box.h));
    if (Math.hypot(pin.x - nearX, pin.y - nearY) < spec.pin + spec.fontSize * 0.45) return "";
    return `<line x1="${pin.x.toFixed(1)}" y1="${pin.y.toFixed(1)}" x2="${nearX.toFixed(1)}" y2="${nearY.toFixed(1)}" stroke="${copperDeep}" stroke-opacity="0.4" stroke-width="1.4"/>`;
  }).join("") : "";
  const marks = labels.map(({ pin }) => {
    return `<g><circle cx="${pin.x.toFixed(1)}" cy="${pin.y.toFixed(1)}" r="${spec.pin}" fill="${paper}"/><circle cx="${pin.x.toFixed(1)}" cy="${pin.y.toFixed(1)}" r="${(spec.pin * 0.58).toFixed(1)}" fill="${copperDeep}"/></g>`;
  }).join("");
  const texts = labels.map(({ pin, box, dir }) => {
    return `<text data-area="${pin.slug}" x="${box.textX.toFixed(1)}" y="${box.textY.toFixed(1)}" text-anchor="${dir.anchor}" dominant-baseline="${dir.base}">${escapeXml(pin.name)}</text>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" role="img">
<title>${escapeXml(altText(areas))}</title>
<defs>
<style>
@font-face { font-family: Geist; src: url("data:font/woff2;base64,${font}") format("woff2"); font-weight: 400 700; }
text { font-family: Geist, system-ui, sans-serif; font-weight: 600; font-size: ${spec.fontSize}px; fill: ${ink}; stroke: ${paper}; stroke-width: ${(spec.fontSize * 0.28).toFixed(1)}; paint-order: stroke fill; stroke-linejoin: round; }
</style>
<filter id="wash" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="${blur}"/>
</filter>
</defs>
<rect width="100%" height="100%" fill="${paper}"/>
<g fill="${copper}" fill-opacity="0.42" filter="url(#wash)">${wash}</g>
<g fill="none" stroke="${ink}" stroke-opacity="0.14" stroke-width="1.25">${ring}</g>
${leaders}
${marks}
${texts}
</svg>
`;
}

function escapeXml(value) {
  return value.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]);
}

const specs = {
  wide: { width: 1260, height: 540, fontSize: 18, pin: 7.5 },
  tall: { width: 780, height: 975, fontSize: 30, pin: 13 },
};

export function buildMaps(html) {
  const areas = areasFromHtml(html);
  return {
    areas,
    alt: altText(areas),
    wide: svgFor(areas, specs.wide, "wide"),
    tall: svgFor(areas, specs.tall, "tall"),
  };
}

export function writeMaps(html = readFileSync(areasHtmlPath, "utf8")) {
  const maps = buildMaps(html);
  mkdirSync(dirname(widePath), { recursive: true });
  writeFileSync(widePath, maps.wide);
  writeFileSync(tallPath, maps.tall);
  return maps;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const maps = writeMaps();
  console.log(maps.alt);
  console.log(maps.areas.map((area) => area.slug).join(", "));
}
