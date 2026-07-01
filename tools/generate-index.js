import { getRootTree } from "./pcloud.js";

async function main() {

    console.log("Connecting to pCloud...");

    const tree = await getRootTree();

    console.log("Connected!");

    console.log(tree.name);

    console.log(tree.contents.length);

}

main().catch(console.error);