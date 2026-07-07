/**
 * Copy custom camo images from ./COD Camos into ./public/camos/
 * Upscale for full-screen display (sources are ~400×150 weapon strips).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "COD Camos");
const TARGET_DIR = path.join(ROOT, "public", "camos");
const MANIFEST_PATH = path.join(TARGET_DIR, "manifest.json");

/** Target height for upscaled portal backgrounds (Lanczos). */
const UPSCALE_HEIGHT = 2400;

const CANONICAL = [
  "woodland",
  "desert",
  "arctic",
  "digital",
  "urban",
  "blue-tiger",
  "red-tiger",
  "fall",
];

const ALIASES = {
  woodland: ["woodland", "wood"],
  desert: ["desert"],
  arctic: ["arctic", "artic", "snow", "winter"],
  digital: ["digital", "digitial"],
  urban: ["urban", "red_urban", "red urban"],
  "blue-tiger": ["blue-tiger", "blue_tiger", "bluetiger", "blue tiger"],
  "red-tiger": ["red-tiger", "red_tiger", "redtiger", "red tiger"],
  fall: ["fall", "orange_fall", "orange fall", "autumn"],
};

function normalize(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/\(mw2\)/gi, "")
    .replace(/[\s_()]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveCanonical(fileName) {
  const base = normalize(fileName);

  for (const canonical of CANONICAL) {
    if (base === canonical) return canonical;
    const aliases = ALIASES[canonical] ?? [];
    if (aliases.some((alias) => normalize(alias) === base)) {
      return canonical;
    }
  }

  for (const canonical of CANONICAL) {
    if (base.startsWith(canonical) || base.includes(canonical)) {
      return canonical;
    }
    const compact = canonical.replace(/-/g, "");
    const baseCompact = base.replace(/-/g, "");
    if (baseCompact.includes(compact)) {
      return canonical;
    }
  }

  return null;
}

function loadManifest() {
  return Object.fromEntries(CANONICAL.map((slug) => [slug, `/camos/${slug}.webp`]));
}

async function upscaleCamo(inputPath, outputPath) {
  const meta = await sharp(inputPath).metadata();
  const inputHeight = meta.height ?? 0;

  let pipeline = sharp(inputPath).rotate();

  if (inputHeight > 0 && inputHeight < UPSCALE_HEIGHT) {
    pipeline = pipeline.resize({
      height: UPSCALE_HEIGHT,
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    });
  }

  await pipeline
    .sharpen({ sigma: 0.6, m1: 0.5, m2: 0.25 })
    .webp({ quality: 94, effort: 6, smartSubsample: true })
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  console.log(
    `  Upscaled ${path.basename(inputPath)} ${meta.width}x${meta.height} -> ${outMeta.width}x${outMeta.height}`
  );
}

async function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  const manifest = loadManifest();

  if (!fs.existsSync(SOURCE_DIR)) {
    console.log("COD Camos folder not found.");
    return;
  }

  const files = fs.readdirSync(SOURCE_DIR, { withFileTypes: true }).filter((entry) => entry.isFile());

  if (files.length === 0) {
    console.log("COD Camos folder is empty.");
    return;
  }

  let copied = 0;

  for (const file of files) {
    const canonical = resolveCanonical(file.name);
    if (!canonical) {
      if (file.name !== "README.md") {
        console.warn(`Skipped unrecognized file: ${file.name}`);
      }
      continue;
    }

    const ext = path.extname(file.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) {
      console.warn(`Skipped unsupported type: ${file.name}`);
      continue;
    }

    const sourcePath = path.join(SOURCE_DIR, file.name);
    const targetPath = path.join(TARGET_DIR, `${canonical}.webp`);

    await upscaleCamo(sourcePath, targetPath);
    manifest[canonical] = `/camos/${canonical}.webp`;

    for (const staleExt of [".svg", ".png", ".jpg", ".jpeg"]) {
      const stalePath = path.join(TARGET_DIR, `${canonical}${staleExt}`);
      if (fs.existsSync(stalePath)) {
        fs.unlinkSync(stalePath);
      }
    }

    console.log(`Synced ${file.name} -> public/camos/${canonical}.webp`);
    copied += 1;
  }

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  console.log(copied > 0 ? `Done. ${copied} camo file(s) synced & upscaled.` : "No camo files synced.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
