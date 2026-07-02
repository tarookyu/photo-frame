const WORKER_URL = "https://pcloud-pfpj-worker.fqxjx219.workers.dev";

const DISPLAY_SECONDS = 30;
const MAX_RETRY = 3;

const slideA = document.getElementById("slideA");
const slideB = document.getElementById("slideB");
const loading = document.getElementById("loading");

let front = slideA;
let back = slideB;
let lastFileId = null;
let timerId = null;

async function fetchRandomPhoto() {
  const res = await fetch(WORKER_URL, { cache: "no-store" });
  const data = await res.json();

  if (!data.ok || !data.photo?.proxyUrl) {
    throw new Error(data.error || "写真URLを取得できませんでした");
  }

  return data.photo;
}

function preload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
}

function detectPortrait(url) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve(img.naturalHeight > img.naturalWidth);
    };

    img.onerror = () => {
      resolve(false);
    };

    img.src = url;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getNextPhotoWithRetry() {
  let lastError;

  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      const photo = await fetchRandomPhoto();

      if (photo.fileid === lastFileId && i < MAX_RETRY - 1) {
        await sleep(300);
        continue;
      }

      const imageUrl = `${photo.proxyUrl}&t=${Date.now()}`;

      await preload(imageUrl);

      return { photo, imageUrl };
    } catch (error) {
      lastError = error;
      await sleep(800 * (i + 1));
    }
  }

  throw lastError;
}

async function showNextPhoto() {
  try {
    const { photo, imageUrl } = await getNextPhotoWithRetry();

    back.style.setProperty("--photo-url", `url("${imageUrl}")`);
    back.style.backgroundImage = "";
    const isPortrait = await detectPortrait(imageUrl);
    back.classList.remove(
        "landscape",
        "portrait",
        "kb1",
        "kb2",
        "kb3",
        "kb4"
    );
    back.classList.add(isPortrait ? "portrait" : "landscape");
    back.style.setProperty("--fit-mode", isPortrait ? "contain" : "cover");
    void back.offsetWidth;
    const effects = ["kb1", "kb2", "kb3", "kb4"];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    back.classList.add(effect);

    back.classList.add("show");
    front.classList.remove("show");

    loading?.classList.add("hide");

    [front, back] = [back, front];

    lastFileId = photo.fileid;

    console.log("Showing:", photo.name);
  } catch (error) {
    console.warn("Photo load failed. Retrying next cycle.", error);

    if (loading) {
      loading.classList.remove("hide");
      loading.innerHTML = `
        <h1>pCloud PFPJ</h1>
        <p>Retrying...</p>
      `;
    }

    setTimeout(showNextPhoto, 3000);
  }
}

function startSlideshow() {
  showNextPhoto();

  if (timerId) {
    clearInterval(timerId);
  }

  timerId = setInterval(showNextPhoto, DISPLAY_SECONDS * 1000);
}

startSlideshow();