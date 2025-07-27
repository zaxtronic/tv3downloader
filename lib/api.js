const URL_REPLACEMENTS = [
  {
    from: "mp4-high-es.ccma.cat.s3.eu-west-1.amazonaws.com/MP4_ALTA_IPTV_ES",
    to: "mp4-down-high-es.3catvideos.cat",
  },
  {
    from: "mp4-high-int.ccma.cat.s3.eu-west-1.amazonaws.com/MP4_ALTA_IPTV_MON",
    to: "mp4-down-high-int.3catvideos.cat",
  },
  {
    from: "mp4-medium-es.ccma.cat.s3.eu-west-1.amazonaws.com/MP4_MITJA_WEB_ES",
    to: "mp4-down-medium-es.3catvideos.cat",
  },
  {
    from: "mp4-medium-int.ccma.cat.s3.eu-west-1.amazonaws.com/MP4_MITJA_WEB_MON",
    to: "mp4-down-medium-int.3catvideos.cat",
  },
];

function replaceUrl(url) {
  return URL_REPLACEMENTS.reduce(
    (acc, { from, to }) => acc.replace(from, to),
    url
  );
}

export async function getVideo(id) {
  let outputVideos = [];
  let subtitles = [];
  let audioDescriptionVideos = [];

  let response = await fetch(
    `https://dinamics.ccma.cat/pvideo/media.jsp?media=video&version=0s&idint=${id}`
  );
  if (!response.ok) return null;

  const body = await response.json();
  if (body === undefined || !body.informacio.estat.actiu) return null;

  const media = body.media;
  const urls = [].concat(media.url);

  urls.forEach((url) => {
    const fileUrl = replaceUrl(url.file);
    let label = url.label;

    // Detectar 1080p y renombrarlo
    if (fileUrl.includes("HD_FULL") || label === "1080p") {
      label = "Qualitat Full HD";
    } else if (label === "720p") {
      label = "Alta qualitat";
    } else if (label === "480p") {
      label = "Mitjana qualitat";
    }

    outputVideos.push({
      format: media.format,
      quality: label,
      url: fileUrl,
    });
  });

  // Ordenar calidad: Full HD > Alta > Mitjana
  const qualityOrder = {
    "Qualitat Full HD": 3,
    "Alta qualitat": 2,
    "Mitjana qualitat": 1,
  };

  outputVideos.sort((a, b) => {
    return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
  });

  if (body.subtitols !== undefined) {
    subtitles = [].concat(body.subtitols);
  }

  const variants = body.variants;
  const variantAud = Array.isArray(variants)
    ? variants.find((variant) => variant.id === "AUD")
    : undefined;

  if (variantAud) {
    const variantsMedia = variantAud.media;
    const urls = [].concat(variantsMedia.url);

    urls.forEach((url) => {
      audioDescriptionVideos.push({
        format: variantsMedia.format,
        quality: url.label,
        url: replaceUrl(url.file),
      });
    });
  }

  const data = {
    title: body.informacio.titol,
    description: body.informacio.descripcio || "",
    imgsrc: body.imatges.url,
    videos: outputVideos,
    audioDescriptionVideos: audioDescriptionVideos,
    subtitles: subtitles,
  };

  return data;
}
