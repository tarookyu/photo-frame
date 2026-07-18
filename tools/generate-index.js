import fs from "fs/promises";
import exifr from "exifr";
import { scanAllMedia, getFileHeadBuffer } from "./pcloud.js";

const EXIF_CACHE_PATH = "data/exif_cache.json";
const MAX_EXIF_PER_RUN = Number(process.env.MAX_EXIF_PER_RUN || 500);
const EXIF_TARGET_PATHS = [
  "/My Pictures/sony_α7Ⅳ",
  "/My Pictures/sony_α5000",
  "/My Pictures/sony_α6000",
  "/My Pictures/Children_Photo"
];

function isJpeg(file) {
  return file.contenttype === "image/jpeg" || /\.(jpg|jpeg)$/i.test(file.name || "");
}

function shouldReadExif(file) {
  const filePath = file.path || "";

  return EXIF_TARGET_PATHS.some((targetPath) =>
    filePath.startsWith(targetPath)
  );
}

function formatShutter(value) {
  if (!value || typeof value !== "number") return null;

  if (value >= 1) {
    return `${value}s`;
  }

  return `1/${Math.round(1 / value)}`;
}

function formatCamera(make, model) {
  if (!make && !model) return null;

  const m = String(make || "").trim();
  const md = String(model || "").trim();

  if (md.toLowerCase().includes(m.toLowerCase())) {
    return md;
  }

  return [m, md].filter(Boolean).join(" ");
}

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function loadExifCache() {
  try {
    const raw = await fs.readFile(EXIF_CACHE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveExifCache(cache) {
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(EXIF_CACHE_PATH, JSON.stringify(cache, null, 2));
}

function cacheKey(file) {
  return `${file.fileid}:${file.hash || file.modified || ""}`;
}

async function extractExif(file) {
  try {
    const buffer = await getFileHeadBuffer(file.fileid);

    const exif = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: false,
      ifd1: false
    });

    if (!exif) return null;

    return {
      camera: formatCamera(exif.Make, exif.Model),
      lens: exif.LensModel || null,
      focalLength: exif.FocalLength || null,
      fNumber: exif.FNumber || null,
      iso: exif.ISO || null,
      shutter: formatShutter(exif.ExposureTime),
      takenAt: toIsoDate(exif.DateTimeOriginal || exif.CreateDate)
    };
  } catch (error) {
    console.warn(`EXIF skipped: ${file.name} (${error.message})`);
    return null;
  }
}

async function main() {
  console.log("Start scanning pCloud...");

  const media = await scanAllMedia();
  const exifCache = await loadExifCache();

  let extracted = 0;

  for (const file of media) {
    if (file.isVideo || !isJpeg(file) || !shouldReadExif(file)) {
          continue;

        }

    const key = cacheKey(file);

    if (exifCache[key]) {
      file.exif = exifCache[key];
      continue;
    }

    if (extracted >= MAX_EXIF_PER_RUN) {
      continue;
    }

    console.log(`Reading EXIF: ${file.path}`);

    const exif = await extractExif(file);

    if (exif) {
      exifCache[key] = exif;
      file.exif = exif;
    }

    extracted++;
  }

  for (const file of media) {
    const key = cacheKey(file);

    if (!file.exif && exifCache[key]) {
      file.exif = exifCache[key];
    }
  }

  const output = {
    version: "1.2",
    generatedAt: new Date().toISOString(),
    count: media.length,
    exifCacheCount: Object.keys(exifCache).length,
    files: media
  };

  await fs.mkdir("data", { recursive: true });

  await fs.writeFile(
    "data/photo_index.json",
    JSON.stringify(output, null, 2)
  );

  await saveExifCache(exifCache);

  console.log("photo_index.json generated.");
  console.log(`Media files: ${media.length}`);
  console.log(`EXIF extracted this run: ${extracted}`);
  console.log(`EXIF cache count: ${Object.keys(exifCache).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});