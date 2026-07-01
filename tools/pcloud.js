import "dotenv/config";
import axios from "axios";

const HOST = process.env.PCLOUD_HOSTNAME;
const TOKEN = process.env.PCLOUD_ACCESS_TOKEN;

if (!HOST || !TOKEN) {
    throw new Error("Missing pCloud environment variables.");
}

export async function getRootTree() {

    const url = `https://${HOST}/listfolder`;

    const response = await axios.get(url, {
        params: {
            access_token: TOKEN,
            folderid: 0,
            showdeleted: 0,
            noshares: 1
        }
    });

    if (response.data.result !== 0) {
        throw new Error(
            `pCloud API Error: ${response.data.result} ${response.data.error}`
        );
    }

    console.log(JSON.stringify(response.data, null, 2));
    return response.data.metadata;
}