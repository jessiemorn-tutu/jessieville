import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const root = new URL('../', import.meta.url).pathname;
const dist = path.join(root, 'dist');
const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
const failures = [];
const migrationAudit = process.argv.includes('--migration-audit');
const htmlFiles = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.html')) htmlFiles.push(file);
  }
}
await walk(dist);
const urls = JSON.parse(await fs.readFile(path.join(root, 'migration/url-map.json')));
const audit = JSON.parse(await fs.readFile(path.join(root, 'migration/content-audit.json')));
const compact = (text) => text.replace(/\s/g, '');
for (const entry of urls) {
  const file = path.join(dist, entry.permalink, 'index.html');
  try {
    const $ = load(await fs.readFile(file, 'utf8'));
    const body = $('.article-grid > .prose, .simple-page > .prose').first().text();
    const expected = audit.find((row) => row.sourceId === entry.sourceId)?.originalText;
    if (migrationAudit && compact(body) !== compact(expected)) failures.push(`Article text differs: ${entry.sourceId} (${entry.title})`);
  } catch { failures.push(`Missing original URL: ${entry.permalink}`); }
}
const checked = new Set();
for (const file of htmlFiles) {
  const $ = load(await fs.readFile(file, 'utf8'));
  if (!$('title').text().trim() || !$('h1').length) failures.push(`Missing title or h1: ${file}`);
  const route = path.relative(dist, file).replace(/index\.html$/, '');
  for (const el of $('a[href], img[src], video[src], video[poster], script[src], link[href]').toArray()) {
    const node = $(el);
    for (const attr of ['href', 'src', 'poster']) {
      const value = node.attr(attr);
      if (!value || /^(https?:|mailto:|tel:|data:|\/\/)/.test(value)) continue;
      const url = new URL(value, `https://local.invalid${base}/${route}`);
      const pathname = decodeURI(url.pathname);
      if (base && !pathname.startsWith(base + '/') && pathname !== base) {
        failures.push(`Link escapes repository base: ${value} in ${route}`);
        continue;
      }
      let local = pathname.slice(base.length);
      const key = local;
      if (checked.has(key)) continue;
      checked.add(key);
      if (local.endsWith('/')) local += 'index.html';
      try { await fs.access(path.join(dist, local)); }
      catch { failures.push(`Broken local link: ${value} in ${route}`); }
    }
  }
  if ($('script[src*="wordpress"], img[src*="wordpress"], video[src*="wordpress"]').length) failures.push(`Unmigrated WordPress media: ${route}`);
}
const assets = JSON.parse(await fs.readFile(path.join(root, 'migration/assets.json')));
for (const asset of assets) if (asset.status !== 'saved') failures.push(`Asset failed: ${asset.source}`);
try {
  const feed = load(await fs.readFile(path.join(dist, 'feed/index.xml'), 'utf8'), { xmlMode: true });
  const archive = load(await fs.readFile(path.join(dist, 'archive/index.html'), 'utf8'));
  if (feed('item').length !== archive('[data-post-row]').length) failures.push('RSS article count differs');
} catch { failures.push('RSS feed is missing'); }
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${urls.length} original URLs${migrationAudit ? ' and article texts' : ''}, ${htmlFiles.length} HTML pages, ${checked.size} local link targets, ${assets.length} saved assets, RSS.`);
