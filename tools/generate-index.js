import fs from "fs/promises";
import { scanAllMedia } from "./pcloud.js";

async function main() {

    console.log("Start scanning pCloud...");

    const media = await scanAllMedia();

    const output = {
        generatedAt: new Date().toISOString(),
        count: media.length,
        files: media
    };

    await fs.mkdir("data", { recursive: true });

    await fs.writeFile(
        "data/photo_index.json",
        JSON.stringify(output, null, 2)
    );

    console.log("photo_index.json generated.");
    console.log(`Media files: ${media.length}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});