// ============================================
// pCloud PFPJ
// Version : 1.0 Alpha
// Part 1
// ============================================

cconst CONFIG = {
    displaySeconds: 30,
    fadeSeconds: 2,
    kenBurns: true,
    fitMode: "contain",
    shuffle: true,
    background: "#000000",
    preloadCount: 2
};

let photos = [];
let playQueue = [];
let currentIndex = 0;

const imageCache = new Map();

const slideA = document.getElementById("slideA");
const slideB = document.getElementById("slideB");
const loading = document.getElementById("loading");

let front = slideA;
let back = slideB;

async function start() {

    console.log("pCloud PFPJ Starting...");

    await loadConfig();

    await loadPhotos();

    createShuffleQueue();

    showCurrentPhoto();

    preloadNext();

    setInterval(nextPhoto, CONFIG.displaySeconds * 1000);

}

async function loadConfig() {

    try {

        const response = await fetch("config/config.json");

        if (response.ok) {

            const json = await response.json();

            Object.assign(CONFIG, json);

        }

        document.body.style.background = CONFIG.background;

        console.log("Config Loaded", CONFIG);

    } catch (err) {

        console.warn("config.json を読み込めませんでした。デフォルト設定を使用します。");

    }

}

async function loadPhotos() {

    const response =
        await fetch("data/photos.json");

    if (!response.ok) {

        throw new Error("photos.json not found");

    }

    photos = await response.json();

    if (photos.length === 0) {

        throw new Error("No photos.");

    }

}