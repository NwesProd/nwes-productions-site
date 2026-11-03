import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://www.nwes.fr';
const DEFAULT_IMAGE = `${SITE}/assets/photos/agence-hero.jpg`;

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseVideo(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return { provider: 'youtube', id: yt[1] };
  const wi = url.match(/wistia\.com\/medias\/([a-zA-Z0-9]+)/) || url.match(/[?&]wvideo=([a-zA-Z0-9]+)/);
  if (wi) return { provider: 'wistia', id: wi[1] };
  const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vi) return { provider: 'vimeo', id: vi[1] };
  return null;
}

async function getThumbnail(videoUrl) {
  const video = parseVideo(videoUrl);
  if (!video) return DEFAULT_IMAGE;
  try {
    if (video.provider === 'youtube') {
      const maxres = `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;
      const head = await fetch(maxres, { method: 'HEAD' });
      return head.ok ? maxres : `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
    }
    if (video.provider === 'vimeo') {
      const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${video.id}`)}&width=1280`);
      const data = await r.json();
      return data.thumbnail_url || DEFAULT_IMAGE;
    }
    if (video.provider === 'wistia') {
      const r = await fetch(`https://fast.wistia.com/oembed?url=${encodeURIComponent(`https://home.wistia.com/medias/${video.id}`)}`);
      const data = await r.json();
      return data.thumbnail_url ? data.thumbnail_url.replace(/image_crop_resized=\d+x\d+/, 'image_crop_resized=1280x720') : DEFAULT_IMAGE;
    }
  } catch (err) {
    // on retombe sur l'image par défaut
  }
  return DEFAULT_IMAGE;
}

export default async function handler(req, res) {
  const html = readFileSync(join(process.cwd(), 'etude-de-cas.html'), 'utf-8');
  const { slug } = req.query;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!slug) {
    res.status(200).send(html);
    return;
  }

  let found = null;
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const apiRes = await fetch(`https://${host}/api/case-studies?slug=${encodeURIComponent(slug)}`);
    if (apiRes.ok) found = await apiRes.json();
  } catch (err) {
    found = null;
  }

  if (!found) {
    res.status(200).send(html);
    return;
  }

  const title = `${found.name} - étude de cas - nwes productions`;
  const description = found.summary || `Étude de cas : projet vidéo réalisé par nwes productions pour ${found.name}.`;
  const image = await getThumbnail(found.videoUrl);
  const url = `${SITE}/etude-de-cas.html?slug=${encodeURIComponent(slug)}`;

  const ogTags = [
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="nwes productions">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
  ].join('\n');

  const out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
    .replace('</head>', `${ogTags}\n</head>`);

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).send(out);
}
