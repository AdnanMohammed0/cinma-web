const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const SEGMENT_EXTS = ['.ts', '.m4s', '.aac', '.mp4', '.vtt', '.webm'];

function headers(ref, cookies) {
  const h = {
    'User-Agent': UA,
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: ref || '',
    Origin: ref ? new URL(ref).origin : '',
  };
  if (cookies) h['Cookie'] = cookies;
  return h;
}

function isSegmentUrl(u) {
  return SEGMENT_EXTS.some((ext) => u.toLowerCase().includes(ext));
}

function rewritePlaylist(text, baseUrl, referer, cookies, proxyPrefix) {
  const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

  return text.split('\n').map((line) => {
    const t = line.trim();
    if (t.startsWith('#') || t === '') return line;

    let abs;
    if (t.startsWith('http://') || t.startsWith('https://')) abs = t;
    else if (t.startsWith('//')) abs = 'https:' + t;
    else abs = new URL(t, baseDir).href;

    const ref = encodeURIComponent(referer || baseUrl);
    const cookie = encodeURIComponent(cookies || '');
    const url = encodeURIComponent(abs);

    if (isSegmentUrl(abs)) return `${proxyPrefix}/segment?url=${url}&cookies=${cookie}&ref=${ref}`;
    if (abs.includes('.m3u8')) return `${proxyPrefix}/playlist?url=${url}&cookies=${cookie}&ref=${ref}`;
    return line;
  }).join('\n');
}

async function getProxiedPlaylist(url, referer, proxyPrefix = '/api/proxy', cookies = '') {
  const { data } = await axios.get(url, {
    headers: headers(referer || url, cookies),
    responseType: 'text',
    timeout: 30000,
    maxRedirects: 5,
  });
  return rewritePlaylist(data, url, referer || url, cookies, proxyPrefix);
}

async function getSegment(url, referer, cookies = '') {
  const { data } = await axios.get(url, {
    headers: headers(referer, cookies),
    responseType: 'arraybuffer',
    timeout: 30000,
    maxRedirects: 5,
    decompress: true,
  });
  return Buffer.from(data);
}

module.exports = { getProxiedPlaylist, getSegment };
