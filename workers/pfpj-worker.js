const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type"
};

async function getJsonFromKV(env, key) {
  const value = await env.PFPJ_INDEX.get(key);
  if (!value) throw new Error(`KV key not found: ${key}`);
  return JSON.parse(value);
}

async function getPCloudFileUrl(env, fileid) {
  const apiUrl =
    `https://${env.PCLOUD_HOSTNAME}/getfilelink?` +
    new URLSearchParams({
      access_token: env.PCLOUD_ACCESS_TOKEN,
      fileid: String(fileid),
      skipfilename: "1"
    });

  const res = await fetch(apiUrl);
  const data = await res.json();

  if (data.result !== 0) {
    throw new Error(`pCloud getfilelink error ${data.result}: ${data.error}`);
  }

  const host = data.hosts?.[0];
  if (!host || !data.path) {
    throw new Error("pCloud getfilelink did not return host/path");
  }

  return `https://${host}${data.path}`;
}

async function getRandomPhoto(env) {
  const manifest = await getJsonFromKV(env, "pfpj:index:manifest");

  const chunkInfo =
    manifest.chunks[Math.floor(Math.random() * manifest.chunks.length)];

  const chunk = await getJsonFromKV(env, chunkInfo.key);

  const photo = chunk[Math.floor(Math.random() * chunk.length)];

  return {
    manifest,
    chunkInfo,
    photo
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/image") {
        const { photo } = await getRandomPhoto(env);
        const imageUrl = await getPCloudFileUrl(env, photo.fileid);

        const imageRes = await fetch(imageUrl);

        return new Response(imageRes.body, {
          headers: {
            ...CORS_HEADERS,
            "content-type": imageRes.headers.get("content-type") || "image/jpeg",
            "cache-control": "no-store"
          }
        });
      }

      const { manifest, chunkInfo, photo } = await getRandomPhoto(env);
      const imageUrl = await getPCloudFileUrl(env, photo.fileid);

      return Response.json(
        {
          ok: true,
          total: manifest.total,
          chunk: chunkInfo.file,
          photo: {
            ...photo,
            url: imageUrl,
            proxyUrl: `${url.origin}/image`
          }
        },
        { headers: CORS_HEADERS }
      );
    } catch (error) {
      return Response.json(
        { ok: false, error: error.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }
};