import fs from "fs/promises";
import path from "path";

const INPUT = "data/photo_index.json";
const OUT_DIR = "data/kv-index";
const CHUNK_SIZE = 1000;

async function main() {
  const raw = await fs.readFile(INPUT, "utf-8");
  const index = JSON.parse(raw);

  const files = index.files ?? [];

  const media = files
    .filter((file) => !file.isVideo)
    .map((file) => ({
      fileid: file.fileid,
      name: file.name,
      path: file.path,
      contenttype: file.contenttype,
      size: file.size,
      created: file.created,
      modified: file.modified,
      hash: file.hash
    }));

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const chunks = [];

  for (let i = 0; i < media.length; i += CHUNK_SIZE) {
    const chunk = media.slice(i, i + CHUNK_SIZE);
    const chunkName = `chunk_${String(chunks.length).padStart(5, "0")}.json`;

    await fs.writeFile(
      path.join(OUT_DIR, chunkName),
      JSON.stringify(chunk)
    );

    chunks.push({
      key: `pfpj:index:${chunkName}`,
      file: chunkName,
      count: chunk.length
    });
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    total: media.length,
    chunkSize: CHUNK_SIZE,
    chunks
  };

  await fs.writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`KV index generated.`);
  console.log(`Photos: ${media.length}`);
  console.log(`Chunks: ${chunks.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});