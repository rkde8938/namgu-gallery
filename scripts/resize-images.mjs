// scripts/resize-images.mjs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const INPUT_DIR = "raw-images";
const OUTPUT_DIR = "public/gallery-images";

// 👉 여기서 원하는 값으로 조정
const FULL_WIDTH = 1600;
const THUMB_WIDTH = 600;

const VALID_EXT = [".jpg", ".jpeg", ".png", ".webp"];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function walk(dir, fileList = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, fileList);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (VALID_EXT.includes(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

async function processImage(inputPath) {
  const rel = path.relative(INPUT_DIR, inputPath); // 예: namgu2025_festival/01.jpg
  const parsed = path.parse(rel);                  // { dir: 'namgu2025_festival', name: '01', ext: '.jpg' }

  const outDir = path.join(OUTPUT_DIR, parsed.dir);
  await ensureDir(outDir);

  const baseName = parsed.name; // '01'
  const fullOut = path.join(outDir, `${baseName}_full.webp`);
  const thumbOut = path.join(outDir, `${baseName}_thumb.webp`);

  console.log(`Processing: ${rel}`);

  // 원본 → 본문용
  await sharp(inputPath)
    .resize({
      width: FULL_WIDTH,
      withoutEnlargement: true, // 원본이 더 작으면 키우지 않기
    })
    .webp({ quality: 80 })
    .toFile(fullOut);

  // 원본 → 썸네일용
  await sharp(inputPath)
    .resize({
      width: THUMB_WIDTH,
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(thumbOut);
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  const files = await walk(INPUT_DIR);
  if (files.length === 0) {
    console.log("No images found in", INPUT_DIR);
    return;
  }

  for (const file of files) {
    await processImage(file);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
