import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const DIR = "data/kv-index";

async function main() {
  const manifestRaw = await fs.readFile(`${DIR}/manifest.json`, "utf-8");
  const manifest = JSON.parse(manifestRaw);

  for (const chunk of manifest.chunks) {
    console.log(`Uploading ${chunk.key} (${chunk.count})`);

    await execFileAsync("npx", [
      "wrangler",
      "kv",
      "key",
      "put",
      chunk.key,
      "--path",
      `${DIR}/${chunk.file}`,
      "--binding",
      "PFPJ_INDEX",
      "--remote"
    ]);
  }

  console.log("All chunks uploaded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});