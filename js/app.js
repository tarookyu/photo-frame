const WORKER_URL = "https://pcloud-pfpj-worker.fqxjx219.workers.dev";

const DISPLAY_SECONDS = 30;

const slideA = document.getElementById("slideA");
const slideB = document.getElementById("slideB");
const loading = document.getElementById("loading");

let front = slideA;
let back = slideB;

async function fetchRandomPhoto() {
  const res = await fetch(WORKER_URL, { cache: "no-store" });
  const data = await res.json();

  if (!data.ok || !data.photo?.url) {
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

async function showNextPhoto() {
  try {
    const photo = await fetchRandomPhoto();

    const imageUrl = `${photo.proxyUrl}?t=${Date.now()}`;


    await preload(imageUrl);
    back.style.backgroundImage = `url("${imageUrl}")`;


    back.classList.remove("zoom1", "zoom2", "zoom3", "zoom4");
    void back.offsetWidth;

    const effects = ["zoom1", "zoom2", "zoom3", "zoom4"];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    back.classList.add(effect);

    back.classList.add("show");
    front.classList.remove("show");

    loading?.classList.add("hide");

    [front, back] = [back, front];

    console.log("Showing:", photo.name);
  } catch (error) {
    console.error(error);

    if (loading) {
      loading.classList.remove("hide");
      loading.innerHTML = `
        <h1>pCloud PFPJ</h1>
        <p style="color:red">${error.message}</p>
      `;
    }
  }
}

showNextPhoto();

setInterval(showNextPhoto, DISPLAY_SECONDS * 1000);