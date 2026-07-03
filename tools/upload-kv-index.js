import "dotenv/config";
import fs from "fs/promises";

const DIR = "data/kv-index";

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const NAMESPACE_ID = process.env.PFPJ_KV_NAMESPACE_ID;

if (!API_TOKEN || !ACCOUNT_ID || !NAMESPACE_ID) {
  throw new Error(
    "Missing CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / PFPJ_KV_NAMESPACE_ID"
  );
}

async function putKV(key, filePath, retries = 3) {
  const value = await fs.readFile(filePath);

  const url =
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}` +
    `/storage/kv/namespaces/${NAMESPACE_ID}/values/${encodeURIComponent(key)}`;

  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: value
      });

      const text = await res.text();

      if (res.ok) {
        return;
      }

      lastError = new Error(`Cloudflare KV upload failed: ${res.status} ${text}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
  }

  throw lastError;
}

async function main() {
  const manifestPath = `${DIR}/manifest.json`;
  const manifestRaw = await fs.readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw);

  console.log("Uploading manifest...");
  await putKV("pfpj:index:manifest", manifestPath);

  for (const chunk of manifest.chunks) {
    console.log(`Uploading ${chunk.key} (${chunk.count})`);
    await putKV(chunk.key, `${DIR}/${chunk.file}`);
  }

  console.log("All chunks uploaded via Cloudflare API.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});