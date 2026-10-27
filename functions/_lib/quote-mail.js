/**
 * Quote form checks and the raw email the Worker sends.
 * No Cloudflare imports here, so it can be tested on its own.
 */

export const FROM = "quotes@lymeplumbing.co.uk";
export const TO = "lymeplumbingandheating@gmail.com";
export const FROM_HEADER = '"Lyme Plumbing & Heating" <quotes@lymeplumbing.co.uk>';

export const LIMITS = {
  photos: 4,
  photoBytes: 3 * 1024 * 1024,
  totalBytes: 8 * 1024 * 1024,
  bodyBytes: 12 * 1024 * 1024,
};

export const JOBS = [
  "Plumbing jobs",
  "Bathrooms",
  "Emergency plumbing",
  "Radiators",
  "Underfloor heating",
  "Heat pumps",
  "Unvented cylinders",
  "Heating controls",
  "Smart controls",
  "Heating faults (not the boiler)",
  "Something else",
];

export const TIMES = ["Any time", "Morning", "Afternoon", "Evening"];

const IMAGE_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const EXT_TYPE = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

const ALLOWED_ORIGINS = [
  "https://lymeplumbing.co.uk",
  "https://www.lymeplumbing.co.uk",
  "https://lymeplumbing.uk",
  "https://www.lymeplumbing.uk",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
];

export function originAllowed(request) {
  const origin = request.headers.get("Origin");
  if (origin) return ALLOWED_ORIGINS.includes(origin);
  const referer = request.headers.get("Referer");
  if (!referer) return false;
  try {
    return ALLOWED_ORIGINS.includes(new URL(referer).origin);
  } catch {
    return false;
  }
}

function cleanHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function cleanBody(value) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export function bytesToBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function wrap76(b64) {
  return b64.replace(/.{1,76}/g, "$&\r\n").replace(/\r\n$/, "");
}

function encodeHeader(value) {
  const clean = cleanHeader(value);
  if (/^[\t\x20-\x7E]*$/.test(clean)) return clean;
  return "=?UTF-8?B?" + bytesToBase64(new TextEncoder().encode(clean)) + "?=";
}

function extOf(file) {
  const type = String(file.type || "").toLowerCase();
  if (IMAGE_EXT[type]) return { ext: IMAGE_EXT[type], type: type === "image/jpg" ? "image/jpeg" : type };
  const name = String(file.name || "");
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m ? m[1] : "";
  if (EXT_TYPE[ext]) return { ext: ext === "jpeg" ? "jpg" : ext, type: EXT_TYPE[ext] };
  return null;
}

function emailOk(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

/**
 * @param {FormData} formData
 * @returns {Promise<{ok:true, fields:object, files:Array}|{ok:false, status:number, message:string}>}
 */
export async function parseSubmission(formData) {
  const field = (name) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  if (cleanHeader(field("hp"))) {
    return { ok: true, honeypot: true, fields: null, files: [] };
  }

  const name = cleanHeader(field("name"));
  const phone = cleanHeader(field("phone"));
  const email = cleanHeader(field("email"));
  const postcode = cleanHeader(field("postcode")).toUpperCase();
  const job = cleanHeader(field("job"));
  const message = cleanBody(field("message"));
  const bestTime = cleanHeader(field("best_time")) || "Any time";
  const consent = cleanHeader(field("consent"));

  if (!name || name.length > 80 || !phone || phone.length > 30 || !postcode || postcode.length > 10 || !message || message.length > 4000) {
    return {
      ok: false,
      status: 400,
      message: "Please fill in your name, phone, postcode and what is happening. Keep each box a sensible length.",
    };
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, status: 400, message: "That phone number does not look right. Please check it and try again." };
  }
  if (!/^[A-Z0-9 ]{2,10}$/.test(postcode)) {
    return { ok: false, status: 400, message: "Please check the postcode and try again." };
  }
  if (email && !emailOk(email)) {
    return { ok: false, status: 400, message: "That email address does not look right. You can leave it blank." };
  }
  if (!JOBS.includes(job)) {
    return { ok: false, status: 400, message: "Please choose which job it is from the list." };
  }
  if (!TIMES.includes(bestTime)) {
    return { ok: false, status: 400, message: "Please choose a best time to call from the list." };
  }
  if (consent !== "yes" && consent !== "on") {
    return { ok: false, status: 400, message: "Please tick the box to say Callum can contact you about this job." };
  }

  const rawFiles = formData.getAll("photo").filter((item) => item && typeof item === "object" && typeof item.arrayBuffer === "function" && item.size > 0);
  if (rawFiles.length > LIMITS.photos) {
    return { ok: false, status: 400, message: "Please send up to 4 photos. If you have more, text them to 07846 729203." };
  }

  const files = [];
  let total = 0;
  for (let i = 0; i < rawFiles.length; i++) {
    const file = rawFiles[i];
    if (file.size > LIMITS.photoBytes) {
      return { ok: false, status: 413, message: "One of those photos is over 3MB. Please send a smaller photo, up to 4 of them." };
    }
    total += file.size;
    if (total > LIMITS.totalBytes) {
      return { ok: false, status: 413, message: "Those photos together are over 8MB. Please send fewer or smaller photos." };
    }
    const kind = extOf(file);
    if (!kind) {
      return { ok: false, status: 400, message: "Photos need to be a JPG, PNG, WEBP, GIF or HEIC." };
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.byteLength > LIMITS.photoBytes) {
      return { ok: false, status: 413, message: "One of those photos is over 3MB. Please send a smaller photo." };
    }
    files.push({ filename: "photo-" + (i + 1) + "." + kind.ext, type: kind.type, bytes: buf });
  }

  return {
    ok: true,
    honeypot: false,
    fields: { name, phone, email, postcode, job, message, bestTime },
    files,
  };
}

export function buildRawEmail(fields, files) {
  const boundary = "lyme-" + crypto.randomUUID().replace(/-/g, "");
  const lines = [
    "From: " + FROM_HEADER,
    "To: " + TO,
    "Subject: " + encodeHeader("Quote enquiry: " + fields.name + " (" + fields.postcode + ")"),
    "MIME-Version: 1.0",
  ];
  if (fields.email) lines.push("Reply-To: " + encodeHeader(fields.email));
  lines.push("Content-Type: multipart/mixed; boundary=\"" + boundary + "\"");
  lines.push("");

  const text = [
    "New quote from lymeplumbing.co.uk",
    "",
    "Name: " + fields.name,
    "Phone: " + fields.phone,
    "Email: " + (fields.email || "(not given)"),
    "Postcode: " + fields.postcode,
    "Job: " + fields.job,
    "Best time to call: " + fields.bestTime,
    "",
    "Message:",
    fields.message,
    "",
    files.length ? "Photos attached: " + files.length : "No photos attached.",
  ].join("\r\n");

  const parts = [];
  parts.push(
    "--" + boundary + "\r\n" +
    "Content-Type: text/plain; charset=utf-8\r\n" +
    "Content-Transfer-Encoding: base64\r\n" +
    "\r\n" +
    wrap76(bytesToBase64(new TextEncoder().encode(text))) + "\r\n"
  );
  for (const file of files) {
    parts.push(
      "--" + boundary + "\r\n" +
      "Content-Type: " + file.type + "; name=\"" + file.filename + "\"\r\n" +
      "Content-Transfer-Encoding: base64\r\n" +
      "Content-Disposition: attachment; filename=\"" + file.filename + "\"\r\n" +
      "\r\n" +
      wrap76(bytesToBase64(file.bytes)) + "\r\n"
    );
  }
  parts.push("--" + boundary + "--\r\n");
  return lines.join("\r\n") + "\r\n" + parts.join("");
}

export function errorPage(message) {
  const safe = String(message)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Quote not sent | Lyme Plumbing &amp; Heating</title>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/assets/scrollcraft.css">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<main id="main">
<section class="phead ground-dark">
  <div class="wrap">
    <h1 class="h1">That didn't send</h1>
    <p class="lede">${safe}</p>
    <div class="cta-row">
      <a class="btn btn--call" href="tel:+447846729203">Call 07846 729203</a>
      <a class="btn btn--ghost" href="sms:+447846729203">Text</a>
      <a class="btn btn--quote" href="/contact/">Back to the form</a>
    </div>
  </div>
</section>
</main>
</body>
</html>`;
}
