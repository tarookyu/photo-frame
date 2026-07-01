import "dotenv/config";
import axios from "axios";

const HOST = process.env.PCLOUD_HOSTNAME;
const TOKEN = process.env.PCLOUD_ACCESS_TOKEN;

if (!HOST || !TOKEN) {
    throw new Error("Missing pCloud environment variables.");
}

const api = axios.create({
    baseURL: `https://${HOST}`,
    timeout: 120000
});

const IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/gif",
    "image/tiff",
    "image/bmp",
    "image/x-canon-cr2",
    "image/x-nikon-nef",
    "image/x-adobe-dng"
]);

const VIDEO_TYPES = new Set([
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/x-ms-wmv"
]);

async function listFolder(folderid) {

    const res = await api.get("/listfolder", {

        params: {

            access_token: TOKEN,

            folderid,

            showdeleted: 0,

            noshares: 1

        }

    });

    if (res.data.result !== 0) {

        throw new Error(
            `pCloud API Error ${res.data.result}: ${res.data.error}`
        );

    }
    return res.data.metadata;

}
function isImage(file) {
    return IMAGE_TYPES.has(file.contenttype);
}

function isVideo(file) {
    return VIDEO_TYPES.has(file.contenttype);
}

export async function scanAllMedia() {
  const queue = [0];
  const media = [];

  while (queue.length > 0) {
    const folderId = queue.shift();
    const folder = await listFolder(folderId);

    console.log(`Scanning: ${folder.name}`);

    if (!folder.contents) {
      continue;
    }

    for (const item of folder.contents) {
      if (item.isfolder) {
        queue.push(item.folderid);
        continue;
      }

      if (!isImage(item) && !isVideo(item)) {
        continue;
      }

      media.push({
        fileid: item.fileid,
        path: item.path,
        name: item.name,
        size: item.size,
        created: item.created,
        modified: item.modified,
        parentfolderid: item.parentfolderid,
        hash: item.hash,
        contenttype: item.contenttype,
        isVideo: isVideo(item)
      });
    }
  }

  console.log(`Found ${media.length} media files.`);

  return media;
}