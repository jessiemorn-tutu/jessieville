// Imports published public content only. Does not require WordPress credentials.
// Run once on a clean checkout: node scripts/import-wordpress.mjs
// To repeat intentionally, back up edited Markdown first, then pass --replace.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const root = new URL('../', import.meta.url).pathname;
const api = 'https://public-api.wordpress.com/rest/v1.1/sites/fantasticjs.com';
const arg = process.argv.indexOf('--source');
const sourceDir = arg === -1 ? null : path.resolve(process.argv[arg + 1]);
const postDir = path.join(root, 'src/content/posts');
if (!process.argv.includes('--replace') && (await fs.readdir(postDir)).length) {
  throw new Error('Markdown already exists. Back it up before importing with --replace.');
}
async function get(url, json = false) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`${response.status}: ${url}`);
      return json ? await response.json() : Buffer.from(await response.arrayBuffer());
    } catch (e) { error = e; }
  }
  throw error;
}
async function allPublished(type) {
  const posts = [];
  for (let offset = 0; ; offset += 100) {
    const batch = await get(`${api}/posts/?type=${type}&number=100&offset=${offset}&order_by=date&order=DESC`, true);
    posts.push(...batch.posts);
    if (posts.length >= batch.found) break;
  }
  return posts;
}
const sourcePosts = sourceDir ? JSON.parse(await fs.readFile(path.join(sourceDir, 'posts.json'), 'utf8')).posts : await allPublished('post');
const sourcePages = sourceDir ? JSON.parse(await fs.readFile(path.join(sourceDir, 'pages.json'), 'utf8')).posts : await allPublished('page');
const all = [...sourcePosts, ...sourcePages];
const cleanText = (html) => load(html).text().replace(/\s+/g, ' ').trim();
const terms = [];
for (const taxonomy of ['categories', 'tags']) {
  for (let offset = 0; ; offset += 100) {
    const batch = await get(`${api}/${taxonomy}/?number=100&offset=${offset}`, true);
    terms.push(...batch[taxonomy].map((term) => ({ name: cleanText(term.name), slug: decodeURI(term.slug), taxonomy: taxonomy === 'categories' ? 'category' : 'tag', permalink: decodeURI(new URL(term.feed_url).pathname.replace(/feed\/$/, '')), parent: term.parent || null })));
    if (offset + batch[taxonomy].length >= batch.found) break;
  }
}
const permalink = (post) => decodeURI(new URL(post.URL).pathname);
const knownPaths = new Set(all.map(permalink));
const assets = new Map();
const keyOf = (url) => { const u = new URL(url); return `${u.hostname}${decodeURI(u.pathname)}`; };
const isUpload = (url) => /^https?:\/\/(fantasticjs(?:\.files)?\.wordpress\.com|uncoverimages\.files\.wordpress\.com|videos\.files\.wordpress\.com)\//.test(url);
function register(url) {
  if (!url || !isUpload(url)) return;
  const key = keyOf(url);
  if (assets.has(key)) return;
  const name = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
  const ext = path.extname(name).toLowerCase();
  const stem = name.slice(0, -ext.length).replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 60) || 'asset';
  const local = `/media/${createHash('sha256').update(key).digest('hex').slice(0, 10)}-${stem}${ext}`;
  assets.set(key, { source: url, local, status: 'pending' });
}
for (const post of all) {
  const $ = load(post.content);
  $('img').each((_, el) => register($(el).attr('src')));
  $('a[href]').each((_, el) => { const url = $(el).attr('href'); if (/\.(pdf|docx?)(\?|$)/i.test(url)) register(url); });
  register(post.featured_image);
}
// Archive the author's public VideoPress clips as native HTML video.
const videos = new Map();
for (const post of all) {
  const $ = load(post.content);
  for (const el of $('iframe').toArray()) {
    const src = $(el).attr('src') || '';
    const match = src.match(/video\.wordpress\.com\/embed\/([a-zA-Z0-9]+)/);
    if (match && !videos.has(match[1])) {
      const info = await get(`https://public-api.wordpress.com/rest/v1.1/videos/${match[1]}`, true);
      const file = info.files.hd?.mp4 || info.files.dvd?.mp4 || info.files.std.mp4;
      const source = info.file_url_base.https + file;
      register(source);
      register(info.poster);
      videos.set(match[1], { source, poster: info.poster });
    }
  }
}
let downloaded = 0;
const pending = [...assets.values()];
const workers = Array.from({ length: 6 }, async () => {
  while (pending.length) {
    const asset = pending.shift();
    try {
      const file = path.join(root, 'public', asset.local);
      try { await fs.access(file); } catch { await fs.writeFile(file, await get(asset.source)); }
      asset.status = 'saved';
    } catch (error) { asset.status = 'failed'; asset.error = String(error); }
    if (++downloaded % 15 === 0) console.log(`Assets: ${downloaded}/${assets.size}`);
  }
});
await Promise.all(workers);

const externalEmbeds = [];
function rewriteUrl(value) {
  if (!value) return value;
  try {
    const url = new URL(value, 'https://fantasticjs.com');
    const asset = assets.get(keyOf(url.href));
    if (asset?.status === 'saved') return asset.local;
    if (['fantasticjs.com', 'www.fantasticjs.com', 'fantasticjs.wordpress.com'].includes(url.hostname)) {
      const route = decodeURI(url.pathname);
      if (knownPaths.has(route) || /^\/(category|tag|author)\//.test(route)) return route + url.hash;
      const id = url.searchParams.get('p');
      const linkedPost = sourcePosts.find((post) => String(post.ID) === id);
      if (linkedPost) return permalink(linkedPost) + url.hash;
    }
  } catch { /* Keep an author's relative or external link as written. */ }
  return value;
}

function sanitized(html, ownerId) {
  const $ = load(html, {}, false);
  $('script, style, form, input, button').remove();
  if (ownerId === 3338) {
    $('p').each((_, el) => {
      const node = $(el);
      if (node.children().length === 1 && node.children('strong').length && /^第[\d\s]+(?:堂)?[課课]/.test(node.text()) && node.text().length < 70) node.replaceWith(`<h2>${node.text()}</h2>`);
    });
  }
  $('iframe').each((_, el) => {
    const node = $(el);
    const match = (node.attr('src') || '').match(/video\.wordpress\.com\/embed\/([a-zA-Z0-9]+)/);
    const video = match && videos.get(match[1]);
    if (video && assets.get(keyOf(video.source))?.status === 'saved') {
      node.replaceWith(`<video controls preload="metadata" playsinline src="${rewriteUrl(video.source)}" poster="${rewriteUrl(video.poster)}" aria-label="原站影片"></video>`);
    }
  });
  $('*').each((_, el) => {
    const node = $(el);
    for (const key of Object.keys(el.attribs || {})) {
      if (key.startsWith('on') || key.startsWith('data-') || ['style', 'srcset', 'sizes'].includes(key)) node.removeAttr(key);
    }
    for (const key of ['href', 'src', 'poster']) {
      const value = node.attr(key);
      if (value && /^\s*(javascript|vbscript):/i.test(value)) node.removeAttr(key);
      else if (value) node.attr(key, rewriteUrl(value));
    }
    if (el.name === 'a' && node.attr('target') === '_blank') node.attr('rel', 'noopener noreferrer');
    if (el.name === 'img') { node.attr('loading', 'lazy'); node.attr('decoding', 'async'); }
    if (el.name === 'iframe') {
      node.attr('loading', 'lazy');
      externalEmbeds.push({ postId: ownerId, url: node.attr('src') });
    }
  });
  // Old WordPress gallery wrappers are presentation only; retain their images.
  return $.html();
}
const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
td.use(gfm);
td.keep(['iframe', 'video', 'audio']);
// HTML emphasis avoids CommonMark's ambiguous boundaries between CJK and Latin.
td.addRule('strong', { filter: ['strong', 'b'], replacement: (content) => `<strong>${content}</strong>` });
td.addRule('emphasis', { filter: ['em', 'i'], replacement: (content) => `<em>${content}</em>` });
// Captions stay distinguishable from the article body.
td.addRule('caption', { filter: 'figcaption', replacement: (content) => `\n\n*${content}*\n\n` });
const entries = [];
for (const post of all) {
  const html = sanitized(post.content, post.ID);
  const text = cleanText(html);
  const categories = Object.keys(post.categories || {}).map(cleanText);
  const tags = Object.keys(post.tags || {}).map(cleanText);
  const $ = load(html);
  const firstParagraph = $('p').toArray().map((el) => $(el).text().trim()).find((s) => s.length > 35) || text;
  const summarySource = post.ID === 3338 ? '思想家思考的問題：認識論、形而上學、道德與美學。從蘇格拉底開始，在一堂堂哲學課裡追問：我們能知道什麼，又可以選擇怎樣活？' : firstParagraph;
  const description = summarySource.length > 125 ? summarySource.slice(0, 125).replace(/\s+\S*$/, '') + '…' : summarySource;
  const originalCover = post.featured_image;
  const cover = originalCover && assets.get(keyOf(originalCover))?.status === 'saved' ? assets.get(keyOf(originalCover)).local : $('img').first().attr('src') || '';
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const words = text.replace(/[\u3400-\u9fff]/g, '').split(/\s+/).filter(Boolean).length;
  const data = {
    title: cleanText(post.title),
    permalink: permalink(post),
    description,
    sourceId: post.ID,
    sourceUrl: post.URL.replace(/^http:/, 'https:'),
    ...(post.type === 'post' ? {
      date: post.date,
      categories,
      tags,
      group: categories.includes('Books') ? 'books' : categories.includes('Movies & Dramas') ? 'screen' : 'life',
      cover,
      readingMinutes: Math.max(1, Math.ceil(cjk / 350 + words / 220)),
    } : {}),
  };
  const frontmatter = Object.entries(data).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  const dir = post.type === 'post' ? 'posts' : 'pages';
  await fs.writeFile(path.join(root, `src/content/${dir}/${post.ID}.md`), `---\n${frontmatter}\n---\n\n${td.turndown(html)}\n`);
  entries.push({ ...data, originalText: cleanText(post.content), importedText: cleanText(html) });
}
const comments = {};
for (const post of all.filter((p) => p.discussion?.comment_count > 0)) {
  const response = await get(`${api}/posts/${post.ID}/replies/?number=100&order=ASC`, true);
  comments[post.ID] = response.comments.map((c) => ({ id: c.ID, parent: c.parent?.ID || null, author: c.author.name, date: c.date, content: sanitized(c.content, post.ID) }));
}
await fs.writeFile(path.join(root, 'migration/comments.json'), JSON.stringify(comments, null, 2) + '\n');
await fs.writeFile(path.join(root, 'migration/taxonomies.json'), JSON.stringify(terms, null, 2) + '\n');
await fs.writeFile(path.join(root, 'migration/url-map.json'), JSON.stringify(entries.map(({ sourceId, sourceUrl, permalink, title }) => ({ sourceId, sourceUrl, permalink, title })), null, 2) + '\n');
await fs.writeFile(path.join(root, 'migration/content-audit.json'), JSON.stringify(entries.map(({ sourceId, originalText, importedText }) => ({ sourceId, originalText, importedText })), null, 2) + '\n');
await fs.writeFile(path.join(root, 'migration/assets.json'), JSON.stringify([...assets.values()], null, 2) + '\n');
await fs.writeFile(path.join(root, 'migration/embeds.json'), JSON.stringify(externalEmbeds, null, 2) + '\n');
const failed = [...assets.values()].filter((asset) => asset.status !== 'saved');
console.log(JSON.stringify({ posts: sourcePosts.length, pages: sourcePages.length, assets: assets.size, failed, comments: Object.values(comments).flat().length, externalEmbeds: externalEmbeds.length }, null, 2));
if (failed.length) process.exitCode = 1;
